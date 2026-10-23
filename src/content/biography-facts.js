// These describe events in the scene, not diagnoses or recoveries inferred from
// an outcome named "good". The age belongs to the scene where the fact occurs.
export const sceneFacts={
 'accident-road':'出了交通事故','accident-site':'因工地意外停了工','accident-fire':'家中遭了火灾','accident-water':'在岸边呼叫救援帮助落水者',
 'victim-bike':'丢了一辆电动车','victim-phone':'手机被抢','victim-fraud':'遭遇电信诈骗','victim-pyramid':'受骗去外地找工作',
 'boundary-drunk':'酒后与人发生冲突','boundary-driving':'酒后开车被查','boundary-prison':'借出银行卡后卷入案件','boundary-theft':'跟同学偷拿了商品','boundary-gambling':'上了牌桌',
 'jianghu-circle':'跟着熟人进了社会圈子','jianghu-esport':'参加了游戏青训','jianghu-south':'南下打工','jianghu-apprentice':'交钱学手艺却没等到工作',
 'trap-loan':'背上多笔消费借款','trap-investment':'买的理财无法兑付','trap-parents':'发现父母买了高价保健品','trap-drugs':'接触毒品后接受戒治',
 'luck-compensation':'拿到搬迁补偿','luck-prize':'中了彩票小奖','luck-mentor':'经前辈推荐接到项目','luck-inheritance':'继承了长辈留下的财产',
 'family-parents-separate':'父母离婚','family-betrayal':'得知伴侣有婚外关系','family-child-school':'陪不愿上学的孩子寻求帮助','family-domestic':'遭遇家庭暴力后寻求保护',
 'body-major':'确诊重病并安排治疗','body-mood':'因持续低落寻求医生帮助','body-occupational':'因长期接触粉尘停工检查','body-parent':'赶去医院照顾父母',
 'warm-neighbor':'收到邻居送来的热汤','warm-reunion':'与旧同桌重逢','warm-library':'开始每周去图书馆','warm-garden':'学着照料阳台上的花',
 'warm-repair':'替父亲修旧收音机','warm-pet':'带楼下受伤的猫去看病','warm-volunteer':'报名当社区志愿者','warm-cooking':'照母亲的语音学做家乡菜',
 'warm-music':'报名参加合唱','warm-walk':'开始和朋友饭后散步','warm-class':'重返夜校学习','warm-lost':'丢失的钱包被人送到失物招领处',
 'warm-birthday':'生日收到蛋糕和手写卡片','warm-letter':'把多年没寄出的信重新写好寄出','warm-team':'工作失误时得到同事帮助','warm-photo':'和家人拍了合照',
 'warm-craft':'手作被朋友带到社区集市','warm-stage':'应朋友邀请排练小剧场演出','warm-train':'去车站接久别的亲人','warm-thanks':'收到多年后的道谢',
 'warm-park':'在公园认识棋友','warm-window':'把住处收拾得敞亮起来','warm-song':'跟孩子学唱歌','warm-home':'回老家与亲人团聚',
 'warm-flower':'给自己买了一束花','warm-helper':'下雨时得到保洁阿姨借来的一把伞','warm-winter':'亲手织了一双手套','warm-second-chance':'有了与旧友和解的机会',
};
// Completed last-scene facts use endedAt. An invitation or a document shown
// in the opening scene is not the later payment, delivery, treatment or reunion.
export const completedSceneFacts={
 'accident-site':'拿到工伤认定和部分补偿','accident-fire':'火灾后搬进临时住处','accident-water':'等到落水者家人报平安',
 'victim-pyramid':'从受骗滞留的外地回到家','jianghu-esport':'青训没能晋级，重新找工作','jianghu-south':'带着欠薪的欠条回到家乡',
 'trap-parents':'陪父母退货，只追回部分钱','luck-prize':'领到彩票奖金存进账户','luck-mentor':'交付前辈推荐的项目，拿到额外报酬','luck-inheritance':'办完手续，继承长辈留下的财产',
 'family-betrayal':'伴侣出轨后安排分居','family-child-school':'陪厌学的孩子求助，调整上学安排','family-domestic':'遭遇家庭暴力后咨询保护令和法律援助',
 'body-major':'开始按医生安排治疗重病','body-mood':'开始接受治疗和复诊','body-occupational':'肺部受损后改变谋生方式','body-parent':'与亲属排好父母的照护轮班',
 'warm-neighbor':'敲开邻居的门，一起做了顿饭','warm-reunion':'回家见了多年未见的同桌','warm-library':'读完一本书，还认识两位书友','warm-garden':'把快枯的花养出新叶',
 'warm-repair':'修好父亲的旧收音机','warm-pet':'给救下的小猫找到了领养人','warm-volunteer':'做完社区志愿活动，认识邻居','warm-cooking':'照母亲语音学会做家乡菜',
 'warm-music':'参加合唱，完成一场演出','warm-walk':'和朋友坚持饭后散步','warm-class':'读完一门夜校课程','warm-lost':'找回丢失的钱包，证件现金都在',
 'warm-birthday':'收下蛋糕，把生日卡留了下来','warm-letter':'寄信后与对方解开旧误会','warm-team':'和同事补救工作失误，赶上期限','warm-photo':'和家人团聚，拍了张新合照',
 'warm-craft':'卖出了第一件手作','warm-stage':'背熟台词，完成小剧场演出','warm-train':'到车站接回久别的亲人','warm-thanks':'收到曾帮助的人多年后的道谢',
 'warm-park':'在公园结识一群棋友','warm-window':'收拾出窗边书桌，养成阅读习惯','warm-song':'跟亲友家的孩子学会一首歌','warm-home':'和亲人把老屋重新收拾敞亮',
 'warm-flower':'买花回家，学着照顾自己','warm-helper':'归还借来的伞，送上一张感谢卡','warm-winter':'拆织几遍，织成第一双手套','warm-second-chance':'与老朋友道歉，重新恢复联系',
};
export const avoidedFacts={
 'boundary-drunk':'结账离开，避开酒桌争执','boundary-driving':'喝酒后没有自己开车','boundary-prison':'拒绝借出银行卡','boundary-theft':'没有跟同学偷拿商品','boundary-gambling':'没有上牌桌','jianghu-circle':'谢绝熟人邀约，选择进厂',
};
