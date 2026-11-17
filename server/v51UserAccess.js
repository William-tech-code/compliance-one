// V51 security policy — never infer account-management authority from generic company read access.
export const USER_ROLES = Object.freeze([
  "Administrador","Compliance","Jurídico","Auditoria","Diretoria","Financeiro","Colaborador","Equipe de Apuração"
]);
export function canReadUserDirectory(role) {
  return role==="Administrador" || role==="Compliance";
}
export function canCreateUser(role) {
  return role==="Administrador";
}
export function validateNewUser({name,email,password,role}={}){
  if(typeof name!=="string" || name.trim().length<2 || name.trim().length>120)
    return {ok:false,error:"INVALID_USER_NAME"};
  if(typeof email!=="string" || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return {ok:false,error:"INVALID_USER_EMAIL"};
  if(typeof password!=="string" || password.length<12 || password.length>1024)
    return {ok:false,error:"PASSWORD_MIN_12"};
  if(!USER_ROLES.includes(role))
    return {ok:false,error:"INVALID_ROLE"};
  return {ok:true,name:name.trim(),email:email.trim().toLowerCase(),role};
}
