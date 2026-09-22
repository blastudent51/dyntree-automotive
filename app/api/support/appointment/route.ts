import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";


export async function POST(
req:Request
){

 const body =
 await req.json();


 const vehicle =
 await prisma.vehicle.findUnique({

  where:{
   treeId:body.treeId
  }

 });


 if(!vehicle){

  return NextResponse.json(
   {
    error:
    "Vehicle not found"
   },
   {
    status:404
   }
  );

 }



 const appointment =
 await prisma.supportAppointment.create({

  data:{
   vehicleId:
    vehicle.id,

   issue:
    body.issue,

   appointment:
    body.date
    ?
    new Date(body.date)
    :
    null
  }

 });



 return NextResponse.json(
  appointment
 );


}
