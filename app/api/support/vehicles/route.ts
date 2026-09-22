import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";


export async function GET(){


 const vehicles =
 await prisma.vehicle.findMany({

  select:{
    treeId:true,
    model:true,
    trim:true,
    color:true,
    ownerName:true
  }

 });


 return NextResponse.json(
   vehicles
 );


}
