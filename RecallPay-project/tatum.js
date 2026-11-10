// Minimal wire-compatible subset of Sui's public state_service.proto.
// https://github.com/MystenLabs/sui-apis/blob/main/proto/sui/rpc/v2/state_service.proto
const grpc = require('@grpc/grpc-js');
const protobuf = require('protobufjs');
const root = protobuf.parse(`syntax = "proto3"; package sui.rpc.v2;
message GetBalanceRequest { optional string owner = 1; optional string coin_type = 2; }
message Balance { optional string coin_type = 1; optional uint64 balance = 3; }
message GetBalanceResponse { optional Balance balance = 1; }`).root;
const Request=root.lookupType('sui.rpc.v2.GetBalanceRequest');
const Response=root.lookupType('sui.rpc.v2.GetBalanceResponse');
const definition={GetBalance:{path:'/sui.rpc.v2.StateService/GetBalance',requestStream:false,responseStream:false,
 requestSerialize:value=>Buffer.from(Request.encode(Request.create(value)).finish()),
 requestDeserialize:buffer=>Request.toObject(Request.decode(buffer),{longs:String}),
 responseSerialize:value=>Buffer.from(Response.encode(Response.create(value)).finish()),
 responseDeserialize:buffer=>Response.toObject(Response.decode(buffer),{longs:String})}};
const Client=grpc.makeGenericClientConstructor(definition,'StateService');
const client=new Client('sui-mainnet-grpc.gateway.tatum.io:443',grpc.credentials.createSsl());
function getBalance(address,key){return new Promise((resolve,reject)=>{
 const metadata=new grpc.Metadata();metadata.set('x-api-key',key);
 client.GetBalance({owner:address,coinType:'0x2::sui::SUI'},metadata,{deadline:new Date(Date.now()+15000)},(err,response)=>{
  if(err)return reject(err); const amount=response?.balance?.balance;
  if(typeof amount!=='string'||!/^\d+$/.test(amount))return reject(new Error('Missing balance in gRPC response'));
  resolve(amount);
 });
});}
module.exports={getBalance,definition};
