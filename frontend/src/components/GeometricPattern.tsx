export function GeometricPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 发光线条 */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-30"></div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-30"></div>
      
      {/* 几何图案 */}
      <div className="absolute top-20 right-20 w-64 h-64 border border-green-400/20 rotate-45 rounded-lg"></div>
      <div className="absolute bottom-20 left-20 w-48 h-48 border border-green-400/10 rotate-12 rounded-full"></div>
      
      {/* 发光点 */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-400 rounded-full glow-green"></div>
      <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-green-400 rounded-full glow-green"></div>
    </div>
  );
}

