import {getV51ExecutiveOverview} from './v51ExecutiveOverview.js';
import {getV51ExecutiveMetrics} from './v51ExecutiveMetrics.js';

export function configureV51ExecutiveMetrics({app,db,authenticate,requirePermission,evidenceRoot}){
  app.get('/api/v51/assessment/executive/overview',authenticate,
    requirePermission('record:read'),(req,res)=>{
      return res.json(getV51ExecutiveOverview(db,{
        companyId:req.user.companyId,evidenceRoot
      }));
    });

  app.get('/api/v51/assessment/cycles/:cycleId/executive',authenticate,
    requirePermission('record:read'),(req,res)=>{
      try{
        return res.json(getV51ExecutiveMetrics(db,{
          companyId:req.user.companyId,cycleId:req.params.cycleId,evidenceRoot
        }));
      }catch(error){
        if(error.message==='CYCLE_NOT_FOUND')
          return res.status(404).json({error:'CYCLE_NOT_FOUND'});
        if(error.message==='INVALID_EXECUTIVE_METRICS')
          return res.status(422).json({error:'INVALID_EXECUTIVE_METRICS'});
        throw error;
      }
    });
}
