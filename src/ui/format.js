const labels = { high:'普通高中', '985':'985本科', '211':'211本科', none:'未入学', primary:'小学', junior:'初中', vocational:'中职', general:'普通高中', highschool:'高中', college:'专科', bachelor:'本科', elite985:'985本科', elite211:'211本科', master:'硕士', phd:'博士', male:'男', female:'女' };
export const label = value => value==='初中未完成'?'初中没读完':labels[value] ?? value ?? '暂无';
export const money = n => `${Math.round(n ?? 0).toLocaleString('zh-CN')} 元`;
