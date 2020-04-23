import React, { useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
//ended up using moment for ease of use, d3 could've handled the date/time as well though
import moment from 'moment';
import './App.css';
import { Table } from './Table';

//real url: https://s3-us-west-2.amazonaws.com/tecton.ai.public/coding_exercise_1/tables.json
const MOMENT_FORMATS = [
  moment.ISO_8601,
  moment.HTML5_FMT.DATETIME_LOCAL_SECONDS,
  'YYYY-MM-DD HH:mm:ss',
  'YYYY/MM/DD',
];

const WEIRD_TIME_FORMAT = 'HH:mm:ss.000';
const isProd = process.env.REACT_APP_IS_PROD;

//from react-table basic sort but parse float... since checking every value for if it is a valid date is super taxing
const BASIC_SORT_PARSE_FLOAT = (rowA, rowB, columnId) => {
  let a = getRowValueByColumnID(rowA, columnId);
  let b = getRowValueByColumnID(rowB, columnId);

  return compareBasic(parseFloat(a), parseFloat(b));
};

function compareBasic(a, b) {
  return a === b ? 0 : a > b ? 1 : -1;
}
function getRowValueByColumnID(row, columnId) {
  return row.values[columnId];
}

function App() {
  const [dataList, setDataList] = useState([]);
  const [dataListFailed, setDataListFailed] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  //initalize dataList
  useEffect(() => {
    getDataList();
  }, []);

  const getDataList = async () => {
    const url = isProd
      ? 'https://s3-us-west-2.amazonaws.com/tecton.ai.public/coding_exercise_1/tables.json'
      : '/tables.json';
    try {
      setLoading(true);
      const request = await fetch(url);
      const data = await request.json();
      setDataList([...data]);
    } catch (e) {
      setDataListFailed(true);
    }
    setLoading(false);
  };

  const getData = async (url) => {
    try {
      setLoading(true);
      const data = await d3.csv(url);
      setData(data);
    } catch (e) {}
    setLoading(false);
  };

  const devFilePathHelper = (url) => {
    const arr = url.split('/');
    return arr[arr.length - 1];
  };

  //from https://stackoverflow.com/questions/21792367/replace-underscores-with-spaces-and-capitalize-words
  const humanize = (str) => {
    var i,
      frags = str.split('_');
    for (i = 0; i < frags.length; i++) {
      frags[i] = frags[i].charAt(0).toUpperCase() + frags[i].slice(1);
    }
    return frags.join(' ');
  };

  const headers = useMemo(() => {
    let headers = [];
    if (data.length > 0) {
      Object.keys(data[0]).forEach((col) => {
        let headerObj = {
          Header: humanize(col),
          accessor: col,
          sortType: 'basic',
        };
        //code here is hacky, we would ideally check more values to see what the data type of this column is
        //or just have the type passed from the server. if index 0 is malformed, would ruin whole column as is
        if (moment(data[0][col], MOMENT_FORMATS, true).isValid()) {
          headerObj.isDate = true;
        } else if (
          !isNaN(parseFloat(data[0][col])) &&
          !moment(data[0][col], WEIRD_TIME_FORMAT, true).isValid()
        ) {
          headerObj.sortType = BASIC_SORT_PARSE_FLOAT;
        }

        headers.push(headerObj);
      });
    }

    return headers;
  }, [data]);

  return (
    <div className='App'>
      <h1>Tecton Data Viewer</h1>
      {dataListFailed && (
        <button className='fetchButton' onClick={getDataList}>
          Fetch Data List
        </button>
      )}
      <div className='dataList'>
        {dataList.map((e, i) => (
          <button
            key={i}
            onClick={() => {
              isProd ? 
                getData(devFilePathHelper(e.url))
                :
                getData(e.url)
            }}
          >
            {`${e.name} - rows: ${e.row_count}`}
          </button>
        ))}
      </div>
      {loading && <div className='spinner' />}
      {!loading && data.length > 0 && (
        <>
          <Table columns={headers} data={data} /> Actual rowcount: {data.length}
        </>
      )}
    </div>
  );
}

export default App;
