// Regulatory reviews belong to one organization and one exact source revision.
export function regulatoryReviewKey(companyId,sourceId,digest){
 for(const value of [companyId,sourceId,digest]){
  if(typeof value!=="string"||!value.trim())throw Error("INVALID_REGULATORY_REVIEW_KEY");
 }
 return JSON.stringify([companyId,sourceId,digest]);
}
export function resolveRegulatoryReview(snapshot,reviews){
 if(!snapshot)return null;
 const matching=reviews.find(review=>review.source_id===snapshot.source_id&&review.digest===snapshot.digest);
 return {...snapshot,status:matching?.decision||snapshot.status,tenantReview:matching||null};
}
