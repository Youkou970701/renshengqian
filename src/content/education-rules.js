// Simulation priors unless explicitly read from cn-stats. The birth grade score
// is uniform 15..85 plus wealth offsets -8,-4,0,4,8. Its national 80th percentile
// is 71; gradePct is a score, not an empirical percentile despite its old name.
export const EDUCATION_RULES={
 status:'参数',topFifthScore:71,competitionSuccess:.10,specialSuccess:.65,talentSuccess:.10,
 countySchoolProbabilities:[.95,.90,.80,.60,.40],
 privateAnnualFee:18000,internationalAnnualFee:120000,adultCourseFee:6000,
};
export const specialPlanEligible=s=>s.hukou==='rural'&&s.gradePct>=EDUCATION_RULES.topFifthScore&&s.highSchoolLocation==='county';
