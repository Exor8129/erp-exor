import * as XLSX from "xlsx";

export async function loadTallyExcel() {
  const response = await fetch("/Tally.xlsx");

  const arrayBuffer = await response.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
  });

  const sheet =
    workbook.Sheets[workbook.SheetNames[0]];

  const data = XLSX.utils.sheet_to_json(sheet);

  return data;
}