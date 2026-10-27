import React from 'react';
export function ColorAxes({color}){
 return <div className="color-axes">{(color?.axes??[]).map(axis=><div className="color-axis" key={axis.id}>
  <div><span>{axis.left}</span><b>{axis.label}</b><span>{axis.right}</span></div>
  <div className="color-track" role="img" aria-label={`${axis.left}到${axis.right}：${axis.label}，依据${axis.evidenceCount}次选择`}>
   {axis.evidenceCount>0&&<i style={{left:`${100*axis.rightScore/Math.max(1,axis.leftScore+axis.rightScore)}%`}}/>}
  </div><small>{axis.evidenceCount?`${axis.evidenceCount} 次相关选择`:'还没有相关选择'}</small>
 </div>)}</div>;
}
