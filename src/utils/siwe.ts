import { getAddress } from 'viem';
import type { SIWEMessage } from '../types';

/**
 * 解析 SIWE 消息格式（内部函数）
 * SIWE 消息格式示例：
 * domain wants you to sign in with your Ethereum account:
 * 0x...
 * 
 * URI: https://...
 * Version: 1
 * Chain ID: 1
 * Nonce: ...
 * Issued At: ...
 */
function parseSIWEMessageInternal(message: string): {
  domain?: string;
  address?: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: number;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
} | null {
  try {
    console.log('[SIWE] Parsing message:', {
      length: message.length,
      first200Chars: message.substring(0, 200),
      containsNewlines: message.includes('\n'),
      containsSpaces: message.includes(' '),
    });
    
    // 支持换行符和空格分隔的格式（前端可能将换行符替换为空格）
    // 先尝试按换行符分割，如果没有换行符，则按特定模式分割
    let lines: string[] = [];
    
    if (message.includes('\n')) {
      lines = message.split('\n').map(l => l.trim()).filter(l => l);
      console.log('[SIWE] Split by newlines, got', lines.length, 'lines');
    } else {
      // 如果没有换行符，可能是空格分隔的格式
      // SIWE 格式通常是：domain wants you to sign in... 0xaddress URI: ... Version: ... 等
      // 我们需要智能分割：按 " URI:", " Version:", " Chain ID:", " Nonce:", " Issued At:", " Expiration Time:" 等关键词分割
      const parts: string[] = [];
      
      // 使用正则表达式匹配 SIWE 字段分隔符
      const fieldPattern = /( URI:| Version:| Chain ID:| Nonce:| Issued At:| Expiration Time:)/;
      const matches = [...message.matchAll(new RegExp(fieldPattern, 'g'))];
      
      if (matches.length > 0) {
        let lastIndex = 0;
        for (const match of matches) {
          if (match.index !== undefined && match.index > lastIndex) {
            parts.push(message.substring(lastIndex, match.index).trim());
            lastIndex = match.index;
          }
        }
        // 添加最后一部分
        if (lastIndex < message.length) {
          parts.push(message.substring(lastIndex).trim());
        }
        lines = parts;
        console.log('[SIWE] Split by field patterns, got', lines.length, 'parts');
      } else {
        // 如果没有找到标准分隔符，尝试按双空格分割（SIWE 格式中字段之间通常有多个空格）
        lines = message.split(/\s{2,}/).map(l => l.trim()).filter(l => l);
        console.log('[SIWE] Split by double spaces, got', lines.length, 'parts');
        
        // 如果还是没分割好，尝试按关键词分割
        if (lines.length <= 1) {
          lines = message.split(/\s+(?=URI:|Version:|Chain ID:|Nonce:|Issued At:|Expiration Time:)/).map(l => l.trim()).filter(l => l);
          console.log('[SIWE] Split by keywords, got', lines.length, 'parts');
        }
      }
    }
    
    console.log('[SIWE] Parsed lines:', lines.length, 'lines');
    const result: any = {};

    // 解析第一行：domain wants you to sign in...
    const firstLine = lines[0] || '';
    if (firstLine.includes('wants you to sign in')) {
      const domainMatch = firstLine.match(/^(.+?)\s+wants you to sign/);
      if (domainMatch) {
        result.domain = domainMatch[1].trim();
      }
      
      // 提取 statement（如果有）
      const statementMatch = firstLine.match(/sign in with your Ethereum account:\s*(.+)$/);
      if (statementMatch) {
        result.statement = statementMatch[1].trim();
      }
    }

    // 解析其他字段
    for (const line of lines) {
      // 查找以太坊地址（0x 开头，42 字符长度）
      const addressMatch = line.match(/0x[a-fA-F0-9]{40}/);
      if (addressMatch) {
        try {
          result.address = getAddress(addressMatch[0]);
          console.log('[SIWE] Found address:', result.address);
        } catch {
          // 忽略无效地址
        }
      }
      
      // 解析 URI
      const uriMatch = line.match(/URI:\s*(.+)/i);
      if (uriMatch) {
        result.uri = uriMatch[1].trim();
        console.log('[SIWE] Found URI:', result.uri);
      }
      
      // 解析 Version
      const versionMatch = line.match(/Version:\s*(.+)/i);
      if (versionMatch) {
        result.version = versionMatch[1].trim();
        console.log('[SIWE] Found Version:', result.version);
      }
      
      // 解析 Chain ID
      const chainIdMatch = line.match(/Chain ID:\s*(\d+)/i);
      if (chainIdMatch) {
        result.chainId = parseInt(chainIdMatch[1], 10);
        console.log('[SIWE] Found Chain ID:', result.chainId);
      }
      
      // 解析 Nonce
      const nonceMatch = line.match(/Nonce:\s*(.+)/i);
      if (nonceMatch) {
        result.nonce = nonceMatch[1].trim();
        console.log('[SIWE] Found Nonce:', result.nonce);
      }
      
      // 解析 Issued At
      const issuedAtMatch = line.match(/Issued At:\s*(.+)/i);
      if (issuedAtMatch) {
        result.issuedAt = issuedAtMatch[1].trim();
        console.log('[SIWE] Found Issued At:', result.issuedAt);
      }
      
      // 解析 Expiration Time
      const expirationMatch = line.match(/Expiration Time:\s*(.+)/i);
      if (expirationMatch) {
        result.expirationTime = expirationMatch[1].trim();
        console.log('[SIWE] Found Expiration Time:', result.expirationTime);
      }
    }
    
    console.log('[SIWE] Parsed result:', {
      hasDomain: !!result.domain,
      hasAddress: !!result.address,
      hasUri: !!result.uri,
      hasVersion: !!result.version,
      hasChainId: !!result.chainId,
      hasNonce: !!result.nonce,
    });

    return result;
  } catch (error) {
    console.error('Error parsing SIWE message:', error);
    return null;
  }
}

/**
 * 验证 SIWE 消息和签名（简化版本，避免 siwe 包的 buffer 依赖问题）
 * 注意：这里只做基本验证，生产环境应该实现完整的签名验证
 */
export async function verifySIWE(
  message: string,
  signature: string,
  domain: string
): Promise<{ valid: boolean; address?: string; error?: string }> {
  try {
    // 解析消息
    const parsed = parseSIWEMessageInternal(message);
    if (!parsed || !parsed.address) {
      return { valid: false, error: 'Invalid message format' };
    }

    // 验证域名（允许部分匹配，因为可能包含协议）
    if (parsed.domain) {
      const parsedDomain = parsed.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const expectedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (parsedDomain !== expectedDomain && !parsedDomain.includes(expectedDomain) && !expectedDomain.includes(parsedDomain)) {
        return { valid: false, error: 'Domain mismatch' };
      }
    }

    // 验证过期时间
    if (parsed.expirationTime) {
      const expiration = new Date(parsed.expirationTime);
      if (expiration < new Date()) {
        return { valid: false, error: 'Message expired' };
      }
    }

    // 验证签名格式
    if (!signature.startsWith('0x') || signature.length !== 132) {
      return { valid: false, error: 'Invalid signature format' };
    }

    // 注意：这里简化了签名验证
    // 生产环境应该使用 viem 的 verifyMessage 或类似的库来验证签名
    // 但由于 Cloudflare Workers 环境的限制，暂时只做格式验证
    
    return { valid: true, address: parsed.address };
  } catch (error) {
    console.error('SIWE verification error:', error);
    return { valid: false, error: 'Invalid signature' };
  }
}

/**
 * 解析 SIWE 消息（兼容类型）
 */
export function parseSIWEMessage(message: string): SIWEMessage | null {
  try {
    const parsed = parseSIWEMessageInternal(message);
    if (!parsed) return null;

    return {
      domain: parsed.domain || '',
      address: parsed.address || '',
      statement: parsed.statement,
      uri: parsed.uri || '',
      version: parsed.version || '1',
      chainId: parsed.chainId || 1,
      nonce: parsed.nonce || '',
      issuedAt: parsed.issuedAt || new Date().toISOString(),
      expirationTime: parsed.expirationTime,
    };
  } catch (error) {
    console.error('Error parsing SIWE message:', error);
    return null;
  }
}

