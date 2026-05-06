import { wordCheckers } from "./wordCheckers.js";

export async function runChecker(checkType, checkParams) {
  const checker = wordCheckers[checkType];

  if (!checker) {
    console.warn(`Check type desconocido: ${checkType}, marcando como auto_pass`);
    return true;
  }

  if (checkType === "auto_pass") {
    return true;
  }

  try {
    return await Word.run(async (context) => {
      const result = await checker(context, checkParams);
      return result;
    });
  } catch (error) {
    console.error(`Error en checker ${checkType}:`, error);
    return false;
  }
}
