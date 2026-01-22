export function GeometricPattern() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* 流体渐变球 - 霓虹紫到电光蓝 */}
      <div 
        className="absolute w-[400px] h-[400px] rounded-full opacity-40 blur-[80px] animate-pulse"
        style={{
          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
          top: '-100px',
          right: '-100px',
          animation: 'float 8s ease-in-out infinite'
        }}
      />
      <div 
        className="absolute w-[300px] h-[300px] rounded-full opacity-40 blur-[80px]"
        style={{
          background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
          bottom: '20%',
          left: '-80px',
          animation: 'float 8s ease-in-out infinite 4s'
        }}
      />
      <div 
        className="absolute w-[250px] h-[250px] rounded-full opacity-30 blur-[80px]"
        style={{
          background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
          top: '50%',
          right: '10%',
          animation: 'float 8s ease-in-out infinite 2s'
        }}
      />
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

