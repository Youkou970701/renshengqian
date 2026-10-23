// Prices and contract terms below are explicit simulation parameters.
export const MONEY_RULES={status:'参数',parentBudget:[1500,4000,10000,30000,120000],mortgageRate:.035,mortgageYears:30,downPayment:.30,onlineRate:.18,depositRate:.02};
const action=(id,label,category,cost,minAge=18,extra={})=>({id,label,category,cost,minAge,...extra});
export const MONEY_ACTIONS=[
 action('tutoring','报名补习班','教育',3000,6,{skill:'study',gain:6}),action('interest','报名兴趣班','教育',1200,6,{skill:'art',gain:5}),action('school-choice','安排择校','教育',12000,6,{skill:'study',gain:8}),
 action('certificate','考证与学技术','自己',2500,16,{skill:'craft',gain:4}),action('checkup','体检','自己',1000,18,{health:2}),action('travel','国内旅行','自己',3000,18,{happy:5}),action('travel-abroad','海外旅行','自己',15000,18,{happy:7}),action('car','买车','自己',60000),
 action('parents','给父母钱','家庭',1000),action('relative','借钱给亲戚','家庭',5000),action('bride-gift','准备彩礼','家庭',30000),action('dowry','准备嫁妆','家庭',20000),
 ...['老家','县城','省会','一线'].flatMap(city=>['small','normal'].map(size=>action(`house:${city}:${size}`,`买${city}${size==='small'?'小房':'普通房'}`,'住房',0,18,{city,size}))),
 action('mortgage-prepay','提前偿还房贷','住房',10000),action('house-sell','卖房','住房',0),action('house-rent','出租住房','住房',0),
 action('deposit','存款','理财',1000),action('fund','买基金','理财',1000),action('stock','买股票','理财',1000),action('wealth','买理财产品','理财',1000),
 action('withdraw-deposit','取出存款','理财',0),action('withdraw-fund','赎回基金','理财',0),action('withdraw-stock','卖出股票','理财',0),action('withdraw-wealth','赎回理财','理财',0),
 action('online-loan','借网贷','借款',0),action('debt-repay','归还网贷','借款',1000),action('lottery','按每周两元买一年彩票','自己',104),
 action('business:shop','开社区小店','经营',40000),action('business:factory','开小厂','经营',120000),action('business:online','开网店','经营',20000),action('business:training','开补习班','经营',30000),
 action('business-hire','给生意请一位员工','经营',3000),action('business-expand','扩张生意','经营',20000),action('business-loan','为经营借款','经营',0),action('business-transfer','转让生意','经营',0),
];
export const MONEY_ACTION_BY_ID=Object.fromEntries(MONEY_ACTIONS.map(a=>[a.id,a]));
export const BUSINESS_TYPES={shop:{name:'社区小店',jobId:'shop'},factory:{name:'小厂',jobId:'smallfactory'},online:{name:'网店',jobId:'onlinestore'},training:{name:'补习班',jobId:'training'}};
