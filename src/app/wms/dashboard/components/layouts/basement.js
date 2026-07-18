const xa = 150; const ya=-100;
const basementWarehouse = {
  id: "wh-002",
  name: "Basement Warehouse",
   // Horizontal offset for better alignment
  elements: [
    

    { id: "Entry1", type: "entry", x: 390 + xa, y: 630 + ya, rotation: -90, textX: 0, textY: 20 },


    {
      id: "SR1",
      type: "s-rack",
      x:315 + xa,
      y: 500 + ya,
      status: "full",
      orientation: "horizontal",
    },
    {
      id: "SR2",
      type: "s-rack",
      x:380 + xa,
      y: 500 + ya,
      status: "full",
      orientation: "horizontal",
    },

    {
      id: "SR4",
      type: "s-rack",
      x:315 + xa,
      y: 475 + ya,
      status: "full",
      orientation: "horizontal",
    },
    {
      id: "SR3",
      type: "s-rack",
      x:380 + xa,
      y: 475 + ya,
      status: "full",
      orientation: "horizontal",
    },
    {
      id: "SR6",
      type: "s-rack",
      x:380 + xa,
      y: 425 + ya,
      status: "full",
      orientation: "horizontal",
    },
    {
      id: "SR5",
      type: "s-rack",
      x:315 + xa,
      y: 425 + ya,
      status: "full",
      orientation: "horizontal",
    },

    {
      id: "SR7",
      type: "s-rack",
      x:250 + xa,
      y: 425 + ya,
      status: "full",
      orientation: "vertical",
    },
    {
      id: "SR8",
      type: "s-rack",
      x:225 + xa,
      y: 425 + ya,
      status: "full",
      orientation: "vertical",
    },

     {
      id: "SR9",
      type: "s-rack",
      x:180 + xa,
      y: 425 + ya,
      status: "full",
      orientation: "vertical",
    },

    {
      id: "SR10",
      type: "s-rack",
      x:180 + xa,
      y: 525 + ya,
      status: "full",
      orientation: "vertical",
    }



  ],
};

export default basementWarehouse;
