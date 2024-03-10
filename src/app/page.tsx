"use client";
import React, { useEffect, useRef, useState } from "react";

import { BarsCalculationResult, BarsObject } from "./types/SteelReinforcement";
import { bars } from "./data/SteelReinforcement";

function numberFormat(item: string) {
  return item.replace(/\./gi, ",");
}

function addSpaces(spacesCount: number) {
  let spaces = "";

  for (let i = 0; i < spacesCount; i++) {
    spaces += " ";
  }

  return spaces;
}

export default function Home() {
  const [steelPrice, setSteelPrice] = useState("");
  const [steelSectionValue, setSteelSectionValue] = useState("");
  const [bedsCount, setBedsCount] = useState("");
  const bedsCountInputRef = useRef<HTMLInputElement>(null);
  const [columnsCount, setColumnsCount] = useState("");
  const columnsCountInputRef = useRef<HTMLInputElement>(null);
  const [workLength, setWorkLength] = useState("");
  const workLengthInputRef = useRef<HTMLInputElement>(null);
  const [minBarDiameter, setMinBarDiameter] = useState("");
  const minBarDiameterInputRef = useRef<HTMLInputElement>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [detailsChoices, setDetailsChoices] = useState<string[]>([]);
  const [detailsChoicesToggles, setDetailsChoicesToggles] = useState([
    false,
    false,
  ]);

  useEffect(() => {
    (async () => {
      if (
        steelPrice === "" ||
        steelSectionValue === "" ||
        bedsCount === "" ||
        columnsCount === ""
      ) {
        setChoices([]);
        setDetailsChoices([]);
        return;
      }

      const floatSteelPrice = parseFloat(steelPrice);
      const floatSteelSection = parseFloat(steelSectionValue);
      const intBedsCount = parseInt(bedsCount);
      const intColumnsCount = parseInt(columnsCount);
      const intWorkLength = parseInt(workLength);
      const intMinBarDiameter = parseInt(minBarDiameter);

      const tmpChoices: string[] = [];
      const tmpDetailsChoices: string[] = [];

      async function getFirstChoiceOneTypeOfBars() {
        for (const bar of bars) {
          if (!isNaN(intMinBarDiameter) && bar.diameter < intMinBarDiameter) {
            continue;
          }

          const sectionsOneTypeOfBars =
            bar.section * intBedsCount * intColumnsCount;

          if (sectionsOneTypeOfBars < floatSteelSection) {
            continue;
          }

          const barsCount = intBedsCount * intColumnsCount;

          let firstChoiceText = `${barsCount} ${
            barsCount !== 1 ? "barres" : "barre"
          } de ${bar.diameter} mm = ${sectionsOneTypeOfBars.toFixed(3)} cm²`;

          let firstChoiceDetailsText =
            `${barsCount} ${barsCount !== 1 ? "barres" : "barre"} de ${
              bar.diameter
            } mm\`` +
            `(${barsCount} x ${bar.section} = ${sectionsOneTypeOfBars.toFixed(
              3
            )} cm²)`;

          let barsWeight = NaN;

          if (!isNaN(intWorkLength)) {
            barsWeight = intWorkLength * barsCount * bar.weight;
          } else {
            return [firstChoiceText, firstChoiceDetailsText];
          }

          firstChoiceText += "`";
          firstChoiceDetailsText += "`";
          firstChoiceDetailsText += `(${intWorkLength} m x ${barsCount} ${
            barsCount !== 1 ? "barres" : "barre"
          } x ${bar.weight} kg = `;

          if (barsWeight > 1000) {
            const tonsWeight = `${(barsWeight / 1000).toFixed(3)} t`;
            firstChoiceText += tonsWeight;
            firstChoiceDetailsText += tonsWeight;

            if (!floatSteelPrice) {
              return [firstChoiceText, firstChoiceDetailsText];
            }

            firstChoiceDetailsText += "`";
            firstChoiceDetailsText += `(${tonsWeight} t x ${floatSteelPrice}€/t = `;
          } else {
            const kgsWeight = barsWeight.toFixed(3);
            firstChoiceText += `${kgsWeight} kg`;
            firstChoiceDetailsText += `${kgsWeight} kg)`;

            if (!floatSteelPrice) {
              return [firstChoiceText, firstChoiceDetailsText];
            }

            firstChoiceDetailsText += "`";
            firstChoiceDetailsText += `(${kgsWeight} kg x ${floatSteelPrice}€/t = `;
          }

          const price = `${((barsWeight / 1000) * floatSteelPrice).toFixed(
            2
          )}€`;

          firstChoiceText += " | ";
          firstChoiceText += price;
          firstChoiceDetailsText += `${price})`;

          return [firstChoiceText, firstChoiceDetailsText];
        }

        return ["", ""];
      }

      const [firstChoiceText, firstChoiceDetailsText] =
        await getFirstChoiceOneTypeOfBars();
      tmpChoices.push(firstChoiceText);
      tmpDetailsChoices.push(firstChoiceDetailsText);

      if (intBedsCount === 1) {
        if (firstChoiceText === "") {
          return;
        }

        setChoices(tmpChoices);
        setDetailsChoices(tmpDetailsChoices);
        return;
      }

      function checkSameBars(resultBars: BarsObject) {
        let tmpCurrentValuesObj = null;
        let tmpCurrentValuesObjSame = true;
        let first = true;

        for (const values of Object.values(resultBars)) {
          if (first) {
            tmpCurrentValuesObj = values;
            first = false;
          }

          tmpCurrentValuesObjSame =
            tmpCurrentValuesObjSame &&
            JSON.stringify(values) === JSON.stringify(tmpCurrentValuesObj);
        }

        return tmpCurrentValuesObjSame;
      }

      function loopChoices(
        prevSections: number,
        remainingBedsCount: number,
        current: BarsObject,
        result: BarsCalculationResult
      ) {
        if (remainingBedsCount === 0) {
          if (prevSections < floatSteelSection) {
            return;
          }

          if (prevSections < result.total.sections) {
            Object.assign(result.bars, current);
            result.total.sections = prevSections;
          }

          return;
        }

        for (const bar of bars) {
          if (!isNaN(intMinBarDiameter) && bar.diameter < intMinBarDiameter) {
            continue;
          }

          if (bar.section > floatSteelSection) {
            continue;
          }

          current[remainingBedsCount] = bar;

          const currentSections = bar.section * intColumnsCount + prevSections;

          loopChoices(currentSections, remainingBedsCount - 1, current, result);
        }
      }

      async function getSecondChoiceDifferentBars() {
        const result: BarsCalculationResult = {
          bars: {},
          total: { sections: Infinity },
        };

        loopChoices(0, intBedsCount, {}, result);

        if (checkSameBars(result.bars)) {
          return ["", ""];
        }

        let secondChoiceText = "";
        let secondChoiceDetailsText = "";
        let totalBarsWeight = 0;

        for (const bar of Object.values(result.bars)) {
          secondChoiceText +=
            `${intColumnsCount} ${
              intColumnsCount !== 1 ? "barres" : "barre"
            } de ${bar.diameter} mm = ` +
            `${(intColumnsCount * bar.section).toFixed(3)} cm²\``;

          secondChoiceDetailsText +=
            `${intColumnsCount} ${
              intColumnsCount !== 1 ? "barres" : "barre"
            } de ${bar.diameter} mm\`` +
            `(${intColumnsCount} x ${bar.section} = ${(
              intColumnsCount * bar.section
            ).toFixed(3)} cm²)\``;

          let barsWeight = NaN;

          if (!isNaN(intWorkLength)) {
            barsWeight = intWorkLength * intColumnsCount * bar.weight;
            totalBarsWeight += barsWeight;
          } else {
            continue;
          }

          secondChoiceDetailsText += `(${intWorkLength} m x ${intColumnsCount} ${
            intColumnsCount !== 1 ? "barres" : "barre"
          } x ${bar.weight} kg = `;

          if (barsWeight > 1000) {
            const tonsWeight = (barsWeight / 1000).toFixed(3);
            secondChoiceText += `${tonsWeight} t`;
            secondChoiceDetailsText += `${tonsWeight} t)\``;

            if (!floatSteelPrice) {
              secondChoiceText += "`";
              continue;
            }

            secondChoiceDetailsText += `(${tonsWeight} t x ${floatSteelPrice}€/t = `;
          } else {
            const kgsWeight = barsWeight.toFixed(3);
            secondChoiceText += `${kgsWeight} kg`;
            secondChoiceDetailsText += `${kgsWeight} kg)\``;

            if (!floatSteelPrice) {
              secondChoiceText += "`";
              continue;
            }

            secondChoiceDetailsText += `(${kgsWeight} kg x ${floatSteelPrice}€/t = `;
          }

          const price = `${((barsWeight / 1000) * floatSteelPrice).toFixed(
            2
          )}€`;

          secondChoiceText += " | ";
          secondChoiceText += price;
          secondChoiceText += "`";

          secondChoiceDetailsText += `${price})\``;
        }

        secondChoiceText.substring(0, secondChoiceText.length - 1);

        let totalText = "";
        totalText += `Total : ${result.total.sections.toFixed(3)} cm²`;

        if (totalBarsWeight > 0) {
          totalText += "`";
          totalText += addSpaces(12);

          if (totalBarsWeight > 1000) {
            totalText += `${(totalBarsWeight / 1000).toFixed(3)} t`;
          } else {
            totalText += `${totalBarsWeight.toFixed(3)} kg`;
          }

          if (floatSteelPrice) {
            totalText += "`";
            totalText += addSpaces(12);
            totalText += `${(
              (totalBarsWeight / 1000) *
              floatSteelPrice
            ).toFixed(2)}€`;
          }
        }

        secondChoiceText += totalText;
        secondChoiceDetailsText += totalText;

        return [secondChoiceText, secondChoiceDetailsText];
      }

      const [secondChoiceText, secondChoiceDetailsText] =
        await getSecondChoiceDifferentBars();
      if (secondChoiceText !== "") {
        tmpChoices.push(secondChoiceText);
        tmpDetailsChoices.push(secondChoiceDetailsText);
      }

      setChoices(tmpChoices);
      setDetailsChoices(tmpDetailsChoices);
    })();
  }, [
    steelPrice,
    steelSectionValue,
    bedsCount,
    columnsCount,
    workLength,
    minBarDiameter,
  ]);

  function renderForm() {
    return (
      <>
        <h1>Calcul de ferraillage</h1>
        <div className="mb-3 row">
          <label className="col-sm-5 col-form-label">
            Prix de l'acier à la tonne
          </label>
          <div className="col-8 col-sm-5">
            <input
              type="number"
              className="form-control"
              onChange={(e) => setSteelPrice(e.target.value)}
              value={steelPrice}
              placeholder="Prix de l'acier à la tonne"
            />
          </div>
          <div className="col-4 col-sm-2 col-form-label">€/t</div>
        </div>
        <div className="mb-3 row">
          <label className="col-sm-5 col-form-label">Section d'aciers</label>
          <div className="col-8 col-sm-5">
            <input
              type="number"
              className="form-control"
              onChange={(e) => setSteelSectionValue(e.target.value)}
              value={steelSectionValue}
              placeholder="Section d'aciers"
            />
          </div>
          <div className="col-4 col-sm-2 col-form-label">cm²</div>
        </div>
        <div className="mb-3 row">
          <label className="col-sm-5 col-form-label">Nb de lits</label>
          <div className="col-8 col-sm-5">
            <input
              ref={bedsCountInputRef}
              type="number"
              className="form-control"
              onChange={(e) => setBedsCount(e.target.value)}
              value={bedsCount}
              placeholder="Nb de lits"
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-sm-5 col-form-label">Nb de colonnes</label>
          <div className="col-8 col-sm-5">
            <input
              ref={columnsCountInputRef}
              type="number"
              className="form-control"
              onChange={(e) => setColumnsCount(e.target.value)}
              value={columnsCount}
              placeholder="Nb de colonnes"
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-sm-5 col-form-label">
            Longueur de l'ouvrage
          </label>
          <div className="col-8 col-sm-5">
            <input
              ref={workLengthInputRef}
              type="number"
              className="form-control"
              onChange={(e) => setWorkLength(e.target.value)}
              value={workLength}
              placeholder="Longueur de l'ouvrage"
            />
          </div>
          <div className="col-4 col-sm-2 col-form-label">m</div>
        </div>
        <div className="mb-3 row">
          <label className="col-sm-5 col-form-label">Diamètre minimum</label>
          <div className="col-8 col-sm-5">
            <input
              ref={minBarDiameterInputRef}
              type="number"
              className="form-control"
              onChange={(e) => setMinBarDiameter(e.target.value)}
              value={minBarDiameter}
              placeholder="Diamètre minimum"
            />
          </div>
          <div className="col-4 col-sm-2 col-form-label">mm</div>
        </div>
      </>
    );
  }

  function toggleDetailsChoice(index: number) {
    let newDetailsChoicesToggles = [...detailsChoicesToggles];
    newDetailsChoicesToggles[index] = !detailsChoicesToggles[index];
    setDetailsChoicesToggles(newDetailsChoicesToggles);
  }

  function renderResult() {
    let choicesResult = [];

    function renderChoiceRow(item: string, parentIndex: number, index: number) {
      return (
        <div key={index}>
          {index === 0 ? (
            <>
              <p style={{ marginTop: '1rem', marginBottom: 0, fontWeight: 'bold' }}>Choix {parentIndex + 1} :</p>
              <p style={{ marginBottom: 0 }}>{numberFormat(item)}</p>
            </>
          ) : (
            <>
              <p style={{ marginBottom: 0 }}>{numberFormat(item)}</p>
            </>
          )}
        </div>
      );
    }

    for (let i = 0; i < choices.length; i++) {
      choicesResult.push(
        !detailsChoicesToggles[i] ? (
          <div key={i} style={{ cursor: "pointer" }} onClick={() => toggleDetailsChoice(i)}>
            {choices[i]
              .split("`")
              .map((subitem, j) => renderChoiceRow(subitem, i, j))}
          </div>
        ) : (
          <div key={i} style={{ cursor: "pointer" }} onClick={() => toggleDetailsChoice(i)}>
            {detailsChoices[i] &&
              detailsChoices[i]
                .split("`")
                .map((subitem, j) => renderChoiceRow(subitem, i, j))}
          </div>
        )
      );
    }

    return (
      <div
        style={{
          paddingTop: 20,
        }}
      >
        {choices.length ? (
          <p
            style={{
              fontWeight: "bold",
              fontSize: 20,
            }}
          >
            Choix
          </p>
        ) : null}
        {choicesResult.map((item, i) => item)}
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 540 }}>
      {renderForm()}
      {renderResult()}
    </div>
  );
}
