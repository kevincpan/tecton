import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useTable, useSortBy, useBlockLayout } from 'react-table';
import { FixedSizeList } from 'react-window';
import throttle from 'lodash/throttle';
import { BarChart } from './BarChart';
import moment from 'moment';
import * as d3 from 'd3';
import { count } from 'd3-array';
import './Table.css';

const TABLE_BOTTOM_OFFSET = 500;
const CELL_WIDTH = 150;

//based off of: https://codesandbox.io/embed/github/tannerlinsley/react-table/tree/master/examples/sorting and other examples
export const Table = React.memo(({ columns, data }) => {
  const defaultColumn = useMemo(() => ({ width: CELL_WIDTH }), []);

  //windows scrollbar takes up 17px so we need this padding. if mac we dont need
  const scrollbarOffset = navigator.userAgent.includes('Mac OS X') ? 0 : 17;

  const [tableHeight, setTableHeight] = useState(
    window.innerHeight - TABLE_BOTTOM_OFFSET
  );

  //sets table height, and listens for window resize to reset table height
  useEffect(() => {
    const throttledWindowResize = throttle(() => {
      setTableHeight(window.innerHeight - TABLE_BOTTOM_OFFSET);
    }, 50);
    window.addEventListener('resize', throttledWindowResize);
    return () => {
      window.removeEventListener('resize', throttledWindowResize);
      throttledWindowResize.cancel();
    };
  }, []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    totalColumnsWidth,
    prepareRow,
  } = useTable({ columns, data, defaultColumn }, useSortBy, useBlockLayout);

  const summary = useMemo(() => {
    const results = {};

    columns.forEach((col) => {
      if (!col.isDate && col.sortType !== 'basic') {
        const [min, max] = d3
          .extent(data, (d) => parseFloat(d[col.accessor]))
          .map((val) => val.toFixed(2));
        results[col.accessor] = {
          type: 'number',
          min,
          max,
          mean: d3.mean(data, (d) => parseFloat(d[col.accessor])).toFixed(2),
          stdDev: d3
            .deviation(data, (d) => parseFloat(d[col.accessor]))
            .toFixed(2),
          nullCount: data.length - count(data, (d) => d[col.accessor]),
        };
      } else if (col.isDate) {
        let nullCount = 0;
        data.forEach((row) => {
          if (
            (row[col.accessor] === null) |
            (row[col.accessor] === undefined)
          ) {
            nullCount++;
          }
        });

        const [min, max] = d3
          .extent(data, (d) => d[col.accessor])
          .map((val) => moment(val).format(moment.HTML5_FMT.DATE));

        results[col.accessor] = {
          type: 'date',
          min,
          max,
          nullCount,
        };
      } else {
        let nullCount = 0;
        let uniqueValues = new Set();
        data.forEach((row) => {
          if (
            (row[col.accessor] === null) |
            (row[col.accessor] === undefined)
          ) {
            nullCount++;
          } else {
            uniqueValues.add(row[col.accessor]);
          }
        });

        results[col.accessor] = {
          type: 'string',
          'unique values': uniqueValues.size,
          nullCount,
        };
      }
    });

    return results;
  }, [columns, data]);

  const renderRow = React.useCallback(
    ({ index, style }) => {
      const row = rows[index];
      prepareRow(row);
      return (
        <div
          {...row.getRowProps({
            style,
          })}
          className='tr'
        >
          {row.cells.map((cell) => {
            return (
              <div {...cell.getCellProps()} className='tdBox'>
                <div className='td'>{cell.render('Cell')}</div>
              </div>
            );
          })}
        </div>
      );
    },
    [prepareRow, rows]
  );

  const renderSummary = useCallback(
    (id, type) => {
      let summaryData = summary[id];
      return (
        <>
          <div className='summary'>
            {Object.keys(summaryData).map((key) => (
              <div key={key}>
                {key}: {summaryData[key]}
              </div>
            ))}
          </div>
          {type === 'number' && (
            <BarChart
              width={CELL_WIDTH}
              height={CELL_WIDTH}
              data={data}
              max={summaryData.max}
              min={summaryData.min}
              colId={id}
            />
          )}
        </>
      );
    },
    [summary, data]
  );

  return (
    <div {...getTableProps()} className='table'>
      <div>
        {headerGroups.map((headerGroup) => (
          <div {...headerGroup.getHeaderGroupProps()} className='tr'>
            {headerGroup.headers.map((column) => (
              <div {...column.getHeaderProps()} className='thBox'>
                <div className='th'>
                  <div {...column.getSortByToggleProps()} className='header'>
                    <strong>{column.render('Header')}</strong>
                    {column.isSorted ? (column.isSortedDesc ? ' ^' : ' v') : ''}
                  </div>
                  {summary[column.id] !== undefined &&
                    renderSummary(column.id, summary[column.id].type)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div {...getTableBodyProps()} className='tableWrapper'>
        <FixedSizeList
          height={tableHeight}
          itemCount={rows.length}
          itemSize={75}
          width={totalColumnsWidth + scrollbarOffset}
        >
          {renderRow}
        </FixedSizeList>
      </div>
    </div>
  );
});
