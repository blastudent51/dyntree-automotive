import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";


export async function POST(req: Request) {

  try {

    const body = await req.json();

    const treeId =
      body.treeId?.toUpperCase();


    if (!treeId) {
      return NextResponse.json(
        {
          error: "TreeID required"
        },
        {
          status: 400
        }
      );
    }


    const vehicle =
      await prisma.vehicle.findUnique({
        where: {
          treeId
        },
        select: {
          treeId: true,
          model: true,
          trim: true,
          color: true,
          ownerName: true
        }
      });


    if (!vehicle) {

      return NextResponse.json(
        {
          found:false,
          message:"Vehicle not found"
        },
        {
          status:404
        }
      );

    }


    return NextResponse.json({

      found:true,

      vehicle

    });


  } catch(error) {

    return NextResponse.json(
      {
        error:"Server error"
      },
      {
        status:500
      }
    );

  }

}
