import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import './BarChart.css';

const MARGIN = { top: 10, right: 10, bottom: 40, left: 40 };

export const BarChart = React.memo(
  ({ width, height, data, type, max, min, colId }) => {
    const svgRef = useRef(null);
    const tooltipRef = useRef(null);

    const update = useCallback(() => {
      let svg = d3.select(svgRef.current).append('g');

      let x = d3
        .scaleLinear()
        .domain([min, max])
        .nice()
        .range([MARGIN.left, width - MARGIN.right]);

      svg
        .append('g')
        .attr('transform', `translate(0, ${height - MARGIN.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-75) translate(0 -4)');

      let histogram = d3
        .histogram()
        .value((d) => d[colId])
        .domain(x.domain())
        .thresholds(10);

      let bins = histogram(data);

      let y = d3.scaleLinear().range([height - MARGIN.bottom, MARGIN.top]);
      y.domain([0, d3.max(bins, (d) => d.length)]);

      svg
        .append('g')
        .attr('transform', `translate(${MARGIN.left}, 0)`)
        .call(d3.axisLeft(y));

      // Add a tooltip div. Here I define the general feature of the tooltip: stuff that do not depend on the data point.
      // Its opacity is set to 0: we don't see it by default.
      let tooltip = d3.select(tooltipRef.current);

      // A function that change this tooltip when the user hover a point.
      // Its opacity is set to 1: we can now see it. Plus it set the text and position of tooltip depending on the datapoint (d)
      let showTooltip = function (d) {
        tooltip.transition().duration(100).style('opacity', 1);
        tooltip.html(`Range: ${d.x0} - ${d.x1}\nCount: ${d.length}`);
      };

      // A function that change this tooltip when the leaves a point: just need to set opacity to 0 again
      let hideTooltip = function (d) {
        tooltip.transition().duration(100).style('opacity', 0);
      };

      svg
        .append('g')
        .attr('fill', 'steelblue')
        .selectAll('rect')
        .data(bins)
        .join('rect')
        .attr('x', (d) => x(d.x0) + 1)
        .attr('width', (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr('y', (d) => y(d.length))
        .attr('height', (d) => y(0) - y(d.length))
        .on('mouseenter', function (d) {
          showTooltip(d);
          d3.select(this).attr('fill', '#c7d9e8');
        })
        .on('mouseleave', function (d) {
          hideTooltip(d);
          d3.select(this).attr('fill', 'steelblue');
        });
    }, [height, width, data, colId, min, max]);

    useEffect(() => {
      update();
    }, [update]);

    return (
      <>
        <div className='tooltip' ref={tooltipRef}>
          hi
        </div>
        <svg className='chart' ref={svgRef} width={width} height={height} />
      </>
    );
  }
);
