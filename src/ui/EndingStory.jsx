import React from 'react';
import {biography} from '../engine/biography.js';
import ShareImage from './ShareImage.jsx';

import {ColorAxes} from './ColorAxes.jsx';
export {ColorAxes} from './ColorAxes.jsx';
export default function EndingStory({life}){
 const end=biography(life);
 return <section className="ending-story"><div className="ending-biography"><p className="eyebrow">这一生，你留下的故事</p><h1>{end.title.name}</h1><p>{end.sentence}</p><small>由这一生实际发生的经历与选择写成。</small></div><div className="ending-color"><p className="eyebrow">人生底色 / 选择留下的方向</p><h2>{end.color.name}</h2><p>{end.color.description}</p><ColorAxes color={end.color}/><small>只描述本局的选择倾向。自动安排的选择也会计入。</small><ShareImage life={life} kind="color"/></div></section>;
}
