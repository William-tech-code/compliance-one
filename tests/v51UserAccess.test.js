import test from "node:test";
import assert from "node:assert/strict";
import {USER_ROLES,canReadUserDirectory,canCreateUser,validateNewUser} from "../server/v51UserAccess.js";

test("only organization administrators can provision users",()=>{
 for(const role of USER_ROLES){
   assert.equal(canCreateUser(role),role==="Administrador",role);
 }
 for(const role of ["",null,"UNKNOWN","__proto__"]){
   assert.equal(canCreateUser(role),false);
 }
});
test("directory access excludes sensitive roles by default",()=>{
 for(const role of USER_ROLES){
   assert.equal(canReadUserDirectory(role),["Administrador","Compliance"].includes(role),role);
 }
});
test("new users require a valid role, name, email and password",()=>{
 const valid={name:"  Pessoa Teste  ",email:"  TESTE@example.com  ",password:"UmaSenhaForte123!",role:"Compliance"};
 assert.deepEqual(validateNewUser(valid),{ok:true,name:"Pessoa Teste",email:"teste@example.com",role:"Compliance"});
 assert.equal(validateNewUser({...valid,role:"Root"}).ok,false);
 assert.equal(validateNewUser({...valid,name:" "}).ok,false);
 assert.equal(validateNewUser({...valid,email:"invalid"}).ok,false);
 assert.equal(validateNewUser({...valid,password:"123"}).ok,false);
 assert.equal(validateNewUser({...valid,password:123}).ok,false);
});
