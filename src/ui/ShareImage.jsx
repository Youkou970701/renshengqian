import React,{useEffect,useRef,useState} from 'react';
const CARD_WIDTH=1080,CARD_HEIGHT=1920;

export async function svgToPng(svg) {
 const svgUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 try {
  await document.fonts?.ready;
  const image=new Image();image.src=svgUrl;
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('图片未能生成，请再试一次。'));});
  const canvas=document.createElement('canvas');canvas.width=CARD_WIDTH;canvas.height=CARD_HEIGHT;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('当前浏览器暂时无法生成图片。');
  ctx.drawImage(image,0,0,CARD_WIDTH,CARD_HEIGHT);
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('图片未能生成，请再试一次。')),'image/png'));
 }finally{URL.revokeObjectURL(svgUrl);}
}

/** A visible local PNG is always available: iOS can long-press it even when download is unsupported. */
export default function ShareImage({life,kind='end',badge='',family=null}) {
 const [state,setState]=useState({busy:false,url:'',blob:null,error:''});
 const current=useRef(''),version=useRef(0);
 const filename=`人生签-${life.id}-${kind==='birth'?'出生':kind==='family'?'家族':kind==='color'?'底色':'终局'}.png`;
 useEffect(()=>()=>{version.current++;if(current.current)URL.revokeObjectURL(current.current);},[]);
 useEffect(()=>{version.current++;if(current.current)URL.revokeObjectURL(current.current);current.current='';setState({busy:false,url:'',blob:null,error:''});},[life.id,kind,badge,family?.length]);
 async function prepare(){
  if(state.blob)return state;
  const startedVersion=version.current;setState(s=>({...s,busy:true,error:''}));
  try {
   const {birthCard,endCard,familyCard,colorCard}=await import('./share-cards.js');
   const svg=(kind==='birth'?birthCard:kind==='family'?familyCard:kind==='color'?colorCard:endCard)(life,{badge,family});const blob=await svgToPng(svg);const url=URL.createObjectURL(blob);if(startedVersion!==version.current){URL.revokeObjectURL(url);return null;}
   if(current.current)URL.revokeObjectURL(current.current);current.current=url;
   const result={busy:false,url,blob,error:''};setState(result);return result;
  }catch(error){setState(s=>({...s,busy:false,error:error.message}));return null;}
 }
 async function save(){const result=await prepare();if(!result)return;
  const a=document.createElement('a');a.href=result.url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 }
 async function share(){const result=await prepare();if(!result)return;const file=new File([result.blob],filename,{type:'image/png'});
  if(navigator.canShare?.({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:'人生签'});}catch(e){if(e.name!=='AbortError')setState(s=>({...s,error:'请长按下方图片保存，或使用保存图片按钮。'}));}}
 }
 return <section className="share-image" aria-label={kind==='birth'?'保存出生卡':kind==='family'?'保存家族卡':kind==='color'?'保存底色卡':'保存终局卡'}>
  <div className="share-actions"><button onClick={save} disabled={state.busy}>{state.busy?'正在生成图片…':'保存图片'}</button><button onClick={share} disabled={state.busy}>分享 / 展开图片</button></div>
  {state.error&&<p role="alert">{state.error}</p>}
  {state.url&&<div className="share-image-preview"><p>图片已在本机生成。手机可长按下图，选择「存储到照片」。</p><a href={state.url} download={filename}>下载 PNG 原图</a><img src={state.url} width="1080" height="1920" alt={`${life.name}的${kind==='birth'?'出生':kind==='family'?'家族':kind==='color'?'底色':'终局'}卡，可长按保存`} style={{display:'block',width:'100%',maxWidth:360,height:'auto',margin:'16px auto'}}/></div>}
 </section>;
}
