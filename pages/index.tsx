import Head from 'next/head'
import Image from 'next/image'
import signatures from '../signatures'
import {groupBy} from "ramda"

export async function getStaticProps(context) {
  return {
    props: {signatures}
  }
}


interface TableEntry {
  subject: string;
  university: string;
  count: number;
}

interface DoubleTableProps {
  entries: TableEntry[];
}

const DoubleTable = ({entries}: DoubleTableProps) => {
  const universities =  new Set((entries.map(x => x.university)));
  let unis = [];
  universities.forEach(v => {
    unis.push(v);
  });
  unis = unis.sort();
  const bySubject = groupBy((v: TableEntry) => v.subject);
  const groupedBySubject: { [subject: string]: TableEntry[] } = bySubject(entries);
  console.log(groupedBySubject);

  return (
    <table>
      <thead>
        <tr>
          <th>
          </th>
          {unis.map(uni => {
            return (
              <th key={uni}>
                {uni}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {Object.keys(groupedBySubject).map(v => {
          const vals = groupedBySubject[v].sort((a,b) => a.university > b.university ? 1 : -1);
          console.log(vals);
          return (
            <tr key={v}><th>{v}</th>{vals.map(val => {
              return (
                <td key={`${val.university}-${v}-${val.count}`}>{val.count}</td>
              );
            })}</tr>
          );
        })}
      </tbody>
    </table>
  );
}

const getEqualisedTableEntries = (entries: TableEntry[]): TableEntry[] => {

  let newEntries: TableEntry[] = [];
  const universities =  new Set((entries.map(x => x.university)));

  const bySubject = groupBy((v: TableEntry) => v.subject);
  let groupedBySubject: { [subject: string]: TableEntry[] } = bySubject(entries);

  Object.keys(groupedBySubject).forEach(v => {
    let vals = groupedBySubject[v];
    let presentUnis = new Set((vals.map(x => x.university)));
    universities.forEach((uni) => {
      if(!presentUnis.has(uni)) {
        vals.push({subject: v, university: uni, count: 0});
      }
    });
    for(let i =0; i < vals.length; i++) {
      newEntries.push(vals[i]);
    }
  });
  return newEntries;
}

export default function Home() {
  let entries: TableEntry[] = [
    {subject: "Compilers", university: "ETH Zuerich", count: 1},
    {subject: "Operating Systems", university: "ETH Zuerich", count: 1},
    {subject: "Operating Systems", university: "UniMelb", count: 1}
  ];
  entries = getEqualisedTableEntries(entries);
  console.log(entries);
  return (
    <div>
      <Head>
        <title>UniMelb CS Open Letter</title>
        <meta name="description" content="Addressing the failings of the UniMelb CS curricilum" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className='container'>
        <h1>
          University of Melbourne Computer Science - Open Letter
        </h1>
        <hr/>
        <div>
          <h2>Letter to the University of Melbourne Computer Science department regarding the quality of curricilum</h2>
          <p>Recent events present a troubled view on the breadth and depth of the CS curriculum at The University of Melbourne, particularly regarding postgraduate studies.</p> 
          <p>An incomplete list of fundamental computer science classes which have left the university and not been satisfactorily replaced are:</p>
        </div>
        <hr/>
        <h3>Below is a comparision of fundamental CS subjects</h3>
        <DoubleTable entries={entries}/>
        <hr/> 
        <h3>Below is the list of people who have signed this letter. You can also submit your signature here.</h3>
        <p>Anonymous names are verified to be real, however, they are not displayed in case this may affect the student or staff member negatively.</p>
        <ul>
          {signatures.map((sig, i) => {
            return (
              <li key={i}> 
                <dl>
                  {sig.anonymous && <dt>Anonymous: {sig.anonymous}</dt>}
                  {sig.name && <dt>Name: {sig.name}</dt>}
                  {sig.position && <dt>Position: {sig.position}</dt>}
                  {sig.affiliation && <dt>Affiliation: {sig.affiliation}</dt>}
                  {sig.degrees && <dt>Degrees: {sig.degrees.join(', ')}</dt>}
                </dl>
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}
