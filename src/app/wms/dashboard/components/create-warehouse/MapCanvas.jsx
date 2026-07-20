"use client";

import React, { useState } from "react";

import Rack from "./Rack";
import SRack from "./SRack";
import FSA from "./FSA";
import Entry from "./Entry";
import WarehouseObject from "./WarehouseObject";


const MapCanvas = ({ elements, onElementSelect }) => {


  const [scale, setScale] = useState(1);

  const [offset, setOffset] = useState({
    x: 0,
    y: 0,
  });


  const [dragging, setDragging] = useState(false);

  const [lastMouse, setLastMouse] = useState(null);



  const warehouseWidth =
    Math.max(
      ...elements.map(
        el =>
          (Number(el.x) || 0) +
          (Number(el.width) || 0)
      ),
      1000
    ) + 100;


  const warehouseHeight =
    Math.max(
      ...elements.map(
        el =>
          (Number(el.y) || 0) +
          (Number(el.height) || 0)
      ),
      700
    ) + 100;



  // -----------------------------
  // Zoom Controls
  // -----------------------------

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };


  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.4));
  };


  const resetView = () => {

    setScale(1);

    setOffset({
      x:0,
      y:0
    });

  };



  const handleWheel = (e)=>{

    e.preventDefault();

    if(e.deltaY < 0)
      zoomIn();
    else
      zoomOut();

  };




  // -----------------------------
  // Pan Controls
  // -----------------------------

  const handleMouseDown=(e)=>{

    setDragging(true);

    setLastMouse({
      x:e.clientX,
      y:e.clientY
    });

  };



  const handleMouseMove=(e)=>{


    if(!dragging || !lastMouse)
      return;



    const dx =
      e.clientX-lastMouse.x;


    const dy =
      e.clientY-lastMouse.y;



    setOffset(prev=>({
      x:prev.x+dx,
      y:prev.y+dy
    }));



    setLastMouse({
      x:e.clientX,
      y:e.clientY
    });


  };



  const stopDragging=()=>{

    setDragging(false);
    setLastMouse(null);

  };





  return (

    <div
      className="
      relative
      w-full
      h-full
      bg-slate-50
      border
      border-slate-200
      rounded-lg
      overflow-hidden
      shadow-inner
      "
    >


      {/* Zoom Controls */}

      <div
        className="
        absolute
        top-4
        right-4
        z-20
        bg-white
        rounded-lg
        shadow
        p-2
        flex
        gap-2
        "
      >

        <button
          className="px-3 py-1 border rounded hover:bg-gray-100"
          onClick={zoomIn}
        >
          +
        </button>


        <button
          className="px-3 py-1 border rounded hover:bg-gray-100"
          onClick={zoomOut}
        >
          -
        </button>


        <button
          className="px-3 py-1 border rounded hover:bg-gray-100"
          onClick={resetView}
        >
          Reset
        </button>


      </div>




      <svg

        width="100%"

        height="100%"

        viewBox={`0 0 ${warehouseWidth} ${warehouseHeight}`}

        preserveAspectRatio="xMidYMid meet"

        className="bg-white"


        onWheel={handleWheel}

        onMouseDown={handleMouseDown}

        onMouseMove={handleMouseMove}

        onMouseUp={stopDragging}

        onMouseLeave={stopDragging}


        style={{
          cursor: dragging
            ? "grabbing"
            : "grab"
        }}

      >



        <defs>

          <pattern

            id="grid"

            width="20"

            height="20"

            patternUnits="userSpaceOnUse"

          >

            <path

              d="M20 0 L0 0 0 20"

              fill="none"

              stroke="#e5e7eb"

              strokeWidth="1"

            />

          </pattern>

        </defs>





        {/* Background Grid */}

        <rect

          width={warehouseWidth}

          height={warehouseHeight}

          fill="url(#grid)"

        />





        {/* Everything inside this group will zoom and move */}

        <g

          transform={`
            translate(${offset.x} ${offset.y})
            scale(${scale})
          `}

        >


        {
          elements.map((el)=>{


            const meta =
              el.metadata || {};



            const standardDataFormat={

              ...el,

              dbId:el.id,

              id:
                meta.custom_label_id ||
                el.id,


              status:
                meta.status ||
                "vacant",


              orientation:
                meta.orientation ||
                "vertical",


              rotation:
                meta.rotation ||
                0,


              textX:
                meta.textX ||
                0,


              color:
                meta.color ||
                "#CDE6FE"

            };




            switch(el.type){


              case "s-rack":

                return (

                  <SRack

                    key={el.id}

                    data={standardDataFormat}

                    onSelect={onElementSelect}

                  />

                );


              case "fsa":

                return (

                  <FSA

                    key={el.id}

                    data={standardDataFormat}

                    onSelect={onElementSelect}

                  />

                );


              case "entry":

                return (

                  <Entry

                    key={el.id}

                    data={standardDataFormat}

                    onSelect={onElementSelect}

                  />

                );


              case "object":

                return (

                  <WarehouseObject

                    key={el.id}

                    data={standardDataFormat}

                    onSelect={onElementSelect}

                  />

                );


              default:

                return (

                  <Rack

                    key={el.id}

                    data={standardDataFormat}

                    onSelect={onElementSelect}

                  />

                );

            }


          })

        }


        </g>


      </svg>


    </div>

  );

};


export default MapCanvas;