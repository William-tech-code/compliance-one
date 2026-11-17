import crypto from 'node:crypto';

const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function encodeBase32(bytes){
 let bits=0,value=0,out='';
 for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=ALPHABET[(value>>>(bits-5))&31];bits-=5}}
 if(bits>0)out+=ALPHABET[(value<<(5-bits))&31];
 return out;
}
export function decodeBase32(value){
 if(typeof value!=='string'||!/^[A-Z2-7]{16,128}$/.test(value))throw Error('INVALID_TOTP_SECRET');
 let bits=0,acc=0,out=[];
 for(const char of value){acc=(acc<<5)|ALPHABET.indexOf(char);bits+=5;if(bits>=8){bits-=8;out.push((acc>>bits)&255)}}
 return Buffer.from(out);
}
export function generateTotpSecret(){return encodeBase32(crypto.randomBytes(20))}
export function totpCode(secret,counter){
 const key=decodeBase32(secret),msg=Buffer.alloc(8);
 msg.writeBigUInt64BE(BigInt(counter));
 const hmac=crypto.createHmac('sha1',key).update(msg).digest();
 const offset=hmac[hmac.length-1]&15;
 return ((hmac.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
export function verifyTotp(secret,code,{now=Date.now(),lastCounter=-1,window=1}={}){
 if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;
 const counter=Math.floor(now/30000);
 for(let delta=-window;delta<=window;delta++){
  const candidate=counter+delta;
  if(candidate<0||candidate<=lastCounter)continue;
  const expected=totpCode(secret,candidate);
  if(crypto.timingSafeEqual(Buffer.from(code),Buffer.from(expected)))return candidate;
 }
 return null;
}
export function encryptTotpSecret(secret,key){
 if(!Buffer.isBuffer(key)||key.length!==32)throw Error('MFA_KEY_NOT_CONFIGURED');
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
 return [iv,cipher.getAuthTag(),encrypted].map(x=>x.toString('base64url')).join('.');
}
export function decryptTotpSecret(value,key){
 if(!Buffer.isBuffer(key)||key.length!==32)throw Error('MFA_KEY_NOT_CONFIGURED');
 const parts=String(value).split('.').map(x=>Buffer.from(x,'base64url'));
 if(parts.length!==3||parts[0].length!==12||parts[1].length!==16)throw Error('INVALID_ENCRYPTED_SECRET');
 const decipher=crypto.createDecipheriv('aes-256-gcm',key,parts[0]);decipher.setAuthTag(parts[1]);
 return Buffer.concat([decipher.update(parts[2]),decipher.final()]).toString('utf8');
}
