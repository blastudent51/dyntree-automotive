import { prisma } from "@/lib/db";
import { generateTreeID } from "./treeid";


export async function createVehicle(data:{
  vin:string;
  ownerName?:string;
  ownerEmail?:string;
  model:string;
  trim:string;
  color?:string;
}) {


  let treeId = generateTreeID();


  while(
    await prisma.vehicle.findUnique({
      where:{
        treeId
      }
    })
  ){

    treeId = generateTreeID();

  }



  return prisma.vehicle.create({

    data:{
      ...data,
      treeId
    }

  });

}
