import { StatusBar } from 'expo-status-bar';
import { Button, StyleSheet, Text, View } from 'react-native';
import React, { useEffect } from 'react';
import {open} from '@op-engineering/op-sqlite'
import { Cozo }from "@mykin-ai/expo-cozo"


function generateUUID() { // Public Domain/MIT
  var d = new Date().getTime();//Timestamp
  var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16;//random number between 0 and 16
      if(d > 0){//Use timestamp until depleted
          r = (d + r)%16 | 0;
          d = Math.floor(d/16);
      } else {//Use microseconds since page-load if supported
          r = (d2 + r)%16 | 0;
          d2 = Math.floor(d2/16);
      }
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
export default function App() {
  const dbname = `${ generateUUID()}-testdb.sqlite`

    const db = open({name: dbname})
  useEffect(async () => {
    async function dbRun() {

    const cozo = new Cozo('sqlite', `${Date.now()}-cozo.db`)
    await cozo.run(':create t {l: String}')
    await cozo.run(`?[l]<-[['boom']] :put t { l }`)

    await db.executeAsync(`create table blobtest ( 
      b blob , 
      stamp integer 
    );`)
    console.log('>>>> 1')
    db.execute(
      `create table if not exists local_vector_ops (
        id varchar(36) primary key,
        tableName varchar,
        tableId varchar,
        op varchar(1),
        stamp REAL
      );`
    );

    db.execute(`
    CREATE TRIGGER blobtest_trigger_on_insert AFTER INSERT ON blobtest WHEN typeof(new.b) <> 'null'
          BEGIN 
          INSERT INTO local_vector_ops (id, tableName,tableId, op, stamp ) VALUES ((select SUBSTR(UUID, 0, 8)||'-'||SUBSTR(UUID,8,4)||'-'||SUBSTR(UUID,12,4)||'-'||SUBSTR(UUID,16) from (select lower(hex(randomblob(16))) AS UUID)), 'blobtest', new.stamp, 'I', unixepoch('subsec'));
          END;
    `)

   db.execute(`
    CREATE TRIGGER blobtest_trigger_on_update AFTER UPDATE OF b ON blobtest WHEN typeof(new.b) <> 'null'
          BEGIN 
          INSERT INTO local_vector_ops (id, tableName,tableId, op, stamp ) VALUES ((select SUBSTR(UUID, 0, 8)||'-'||SUBSTR(UUID,8,4)||'-'||SUBSTR(UUID,12,4)||'-'||SUBSTR(UUID,16) from (select lower(hex(randomblob(16))) AS UUID)), 'blobtest', new.stamp, 'U', unixepoch('subsec'));
          END;
    `)
    db.execute(`
    CREATE TRIGGER blobtest_trigger_on_delete AFTER DELETE ON blobtest 
          BEGIN 
          INSERT INTO local_vector_ops (id, tableName,tableId, op, stamp ) VALUES ((select SUBSTR(UUID, 0, 8)||'-'||SUBSTR(UUID,8,4)||'-'||SUBSTR(UUID,12,4)||'-'||SUBSTR(UUID,16) from (select lower(hex(randomblob(16))) AS UUID)), 'blobtest', old.stamp, 'D', unixepoch('subsec'));
          END;
    `)

    for (let j = 0 ; j < 40 ; j++) {
      db.transaction(() => {
      db.execute('insert into blobtest (b, stamp) values (randomblob(ABS(RANDOM()) % (128 - 16) + 16),  unixepoch() );')
      console.log('i --------'+j+'----------- i')
    })
    }

    const version =  db.execute('select sqlite_version();')
    console.log('db name', dbname, 'version  ', version.rows)
  }
  dbRun().catch((e)=> { console.error(e)})
  }, [])
  async function queryHandler() {
    const result =await db.executeRawAsync('select b, stamp from blobtest;') 
    for (let i = 0; i < result.length ; i++ ) {
     const [b , stamp ] = result[i]
     console.log(typeof b , new Uint8Array(b))
    }

 }
 async function InsertHandler() {
  db.execute('insert into blobtest (b, stamp) values (randomblob(ABS(RANDOM()) % (128 - 16) + 16),  unixepoch() );')
}
  return (
    <View style={styles.container}>
  
      <StatusBar style="auto" />
      <Button onPress={() => InsertHandler()} title='insert' />
      <Button onPress={() => queryHandler()} title='query' />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
