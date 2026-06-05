import React, { useRef, useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import { BasketballCourt } from "./BasketballCourt";

const frameDurationMs = 200;

const DrawPlayerVisualization = ({
  width,
  playerData,
  T_type = "real_T",
  isPlaying,
  currentStep,
  setCurrentStep,
  setIsPlaying,
  qPlayer,
  realPlayerActions, // 添加真实动作数据
  showActionValues = true,
}) => {
  const courtSVG = useRef();

  const [newPlayerData, setNewPlayerData] = useState([]);

  useEffect(() => {
    if (playerData.length > 0) {
      setNewPlayerData(playerData);
    }
  }, [playerData]);

  const qColorScale = useMemo(
    () =>
      d3
        .scaleSequential(d3.interpolateViridis)
        .domain([-1.4, 0.3]) // 黄色对应高Q值
        .clamp(true),
    [],
  );

  const arcGenerator = useMemo(
    () =>
      d3
        .arc()
        .innerRadius((d) => d.inner)
        .outerRadius((d) => d.outer)
        .startAngle((d) => d.start)
        .endAngle((d) => d.end),
    [],
  );

  useEffect(() => {
    const svg = d3.select(courtSVG.current);
    svg.selectAll("*").remove();

    const courtItem = svg.append("g").attr("class", "courtGroup");
    const playerIMGWidth = width / 20;

    const validData = playerData.filter(
      (d) => d[T_type] && d[T_type].length > 0,
    );

    const groups = courtItem
      .selectAll("g")
      .data(validData, (d) => d.agent_id)
      .join("g")
      .attr("class", (d, i) => `player-group player-idx-${i}`)
      .attr("transform", (d) => {
        const x = d[T_type][0][0];
        const y = d[T_type][0][1];
        return `translate(${(x * width) / 94}, ${(y * width) / 94})`;
      });

    groups.each(function (d, i) {
      const group = d3.select(this);
      const radius = d.agent_id === -1 ? width / 120 : width / 60;
      const clipPathId = `clip-path-${d.agent_id}-${T_type}`;

      if (showActionValues && d.agent_id !== -1 && i > 0 && i <= 5) {
        const actionGroup = group.append("g").attr("class", "player-q-space");
        const rings = [
          { inner: radius + 2, outer: radius + 12, range: [1, 8] },
          { inner: radius + 12, outer: radius + 22, range: [9, 16] },
          { inner: radius + 22, outer: radius + 32, range: [17, 24] },
        ];

        rings.forEach((ring) => {
          for (let step = 0; step < 8; step++) {
            const actionId = ring.range[0] + step;
            actionGroup
              .append("path")
              .attr("class", `q-arc-${actionId}`)
              .attr(
                "d",
                arcGenerator({
                  inner: ring.inner,
                  outer: ring.outer,
                  start: (step * 45 * Math.PI) / 180 + 3 * Math.PI / 2, // 再加180度，总共转270度
                  end: ((step + 1) * 45 * Math.PI) / 180 + 3 * Math.PI / 2,
                }),
              )
              .style("fill", "#333")
              .style("stroke", "#000")
              .style("stroke-width", 0.3);
          }
        });

        actionGroup
          .append("circle")
          .attr("class", "q-arc-0")
          .attr("r", radius - 3)
          .style("fill", "#333");
      }

      if (d.agent_id !== -1) {
        group
          .append("clipPath")
          .attr("id", clipPathId)
          .append("circle")
          .attr("r", radius);
      }

      let playerFill = d.agent_id === -1 ? "orange" : "#222222";
      if (i > 5) playerFill = "#d1d5db";

      group
        .append("circle")
        .attr("class", "player-base-circle")

        .attr("r", radius)
        .style("fill", playerFill)
        .style("stroke-width", 2)
        .style("stroke", "#ffffff")
        .style("opacity", 0.9);

      const image = group
        .append("image")
        .attr(
          "href",
          d.agent_id === -1
            ? ""
            : `https://cdn.nba.com/headshots/nba/latest/1040x760/${d.agent_id}.png`,
        )
        .attr("width", d.agent_id === -1 ? 2 * radius : playerIMGWidth)
        .attr("height", d.agent_id === -1 ? 2 * radius : playerIMGWidth)
        .attr("x", d.agent_id === -1 ? -radius / 2 : -playerIMGWidth / 2)
        .attr(
          "y",
          d.agent_id === -1 ? -radius / 2 + 10 : -playerIMGWidth / 2 + 10,
        )
        .style("opacity", 0.7)
        .attr("transform", "rotate(90)");

      if (d.agent_id !== -1) image.attr("clip-path", `url(#${clipPathId})`);
      
      // 为进攻方球员（索引1-5）添加数字标注
      if (i >= 1 && i <= 5) {
        // 添加白色圆形背景
        group
          .append("circle")
          .attr("class", "player-number-bg")
          .attr("cx", 0)
          .attr("cy", 0)
          .attr("r", 8)
          .style("fill", "white")
          .style("stroke", "#333")
          .style("stroke-width", "1px");
        
        group
          .append("text")
          .attr("class", "player-number")
          .attr("x", 0)
          .attr("y", 0)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central")
          .attr("transform", "rotate(90)")  // 顺时针旋转90度
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .style("fill", "#000")
          .style("pointer-events", "none")
          .text(i); // 显示索引号（1-5）
      }
      
      if (d.agent_id === -1) group.raise();
    });
  }, [playerData, width, T_type, showActionValues, arcGenerator]);

  // --- Linear playback clock ---
  useEffect(() => {
    if (!isPlaying) return;
    if (!newPlayerData?.length || !newPlayerData[0]?.[T_type]?.length) return;

    const frameCount = newPlayerData[0][T_type].length;
    const intervalId = window.setInterval(() => {
      setCurrentStep((step) => {
        if (step >= frameCount - 1) {
          setIsPlaying?.(false);
          return step;
        }

        return step + 1;
      });
    }, frameDurationMs);

    return () => window.clearInterval(intervalId);
  }, [
    isPlaying,
    newPlayerData,
    T_type,
    setCurrentStep,
    setIsPlaying,
  ]);

  // --- Frame render update ---
  useEffect(() => {
    if (!newPlayerData || newPlayerData.length === 0) return;
    if (!newPlayerData[0][T_type]) return;

    const groups = d3
      .select(courtSVG.current)
      .selectAll(".courtGroup g.player-group");

    groups
      .interrupt()
      .transition()
      .duration(isPlaying ? frameDurationMs : 0)
      .ease(d3.easeLinear)
      .attr("transform", (d) => {
        if (currentStep < d[T_type].length) {
          return `translate(${(d[T_type][currentStep][0] * width) / 94}, ${(d[T_type][currentStep][1] * width) / 94})`;
        }
        return null;
      });

    if (showActionValues && qPlayer && qPlayer[currentStep]) {
      qPlayer[currentStep].forEach((pActions, pIdx) => {
        const pGroup = d3.select(`.player-idx-${pIdx + 1}`);
        const realAction = realPlayerActions?.[currentStep]?.[pIdx];
        const isStayAction = realAction === 0;

        pGroup
          .select(".player-base-circle")
          .style("stroke", isStayAction ? "#FF0000" : "#ffffff")
          .style("stroke-width", isStayAction ? 4 : 2);

        pActions.forEach((val, actionId) => {
          const isRealAction =
            realPlayerActions &&
            realPlayerActions[currentStep] &&
            realPlayerActions[currentStep][pIdx] === actionId;

          pGroup
            .select(`.q-arc-${actionId}`)
            .style("fill", qColorScale(val))
            .style("stroke", isRealAction ? "#FF0000" : "#000")
            .style("stroke-width", isRealAction ? 3 : 0.3);
        });

        const q0 = pActions?.[0];
        if (q0 != null) {
          pGroup
            .select(".player-base-circle")
            .style("fill", qColorScale(q0))
            .style("opacity", 0.95);
        }
      });
    }
  }, [isPlaying, currentStep, newPlayerData, T_type, width, qPlayer, realPlayerActions, showActionValues, qColorScale]);

  return <g ref={courtSVG} className="playerLayer" />;
};

export const DrawPlayers = ({ 
  width, 
  playerData, 
  qPlayer, 
  currentStep = 0,
  setCurrentStep,
  isPlaying = false,
  setIsPlaying,
  realPlayerActions,
  showActionValues = true,
}) => {
  const logicalLength = width;
  const logicalWidth = (width * 50) / 94;

  const svgWidth = logicalWidth;
  const svgHeight = logicalLength / 2;

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      style={{ border: "none", display: "block", backgroundColor: "#ffffff" }}
    >
        <g transform={`translate(0, ${svgHeight}) rotate(-90)`}>
          <BasketballCourt width={logicalLength} />
          <DrawPlayerVisualization
            width={logicalLength}
            playerData={playerData}
            T_type="real_T"
            isPlaying={isPlaying}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            setIsPlaying={setIsPlaying}
            qPlayer={qPlayer}
            realPlayerActions={realPlayerActions}
            showActionValues={showActionValues}
          />
        </g>
    </svg>
  );
};
