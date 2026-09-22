const CHARACTERS =
  "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";


export function generateTreeID() {

  let result = "";

  for(let i = 0; i < 4; i++) {

    result += CHARACTERS[
      Math.floor(
        Math.random() *
        CHARACTERS.length
      )
    ];

  }

  return `DT-${result}`;
}
