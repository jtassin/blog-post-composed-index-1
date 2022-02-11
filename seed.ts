import { MongoClient } from 'mongodb';

async function run() {
    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    const dbName = 'blog-post-composed-index';
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('runs');
    await collection.drop().catch(() => {})

    const firstDate = new Date('1337-01-01')
    let batch:{
        date: Date,
        status: string
    }[] = []
    const batchLength = 100_000;
    let insert: Promise<unknown> = Promise.resolve()
    for(let i = 0 ; i < 10_000_000 ; i+=1) {
        // for(let i = 0 ; i < 1_000_000 ; i+=1) {
        let status = 'success'
        if(Math.random() > 0.99) {
            status = 'error'
        }
        const date = new Date(firstDate.valueOf() + 10 * 60 * 1000 * i);
        batch.push({
            status,
            date
        })
        if(batch.length === batchLength) {
            await insert;
            process.stdout.write('.')
            insert = collection.insertMany(batch)
            batch = []
        }
    }
    await insert;
    if(batch.length) {
        await collection.insertMany(batch)
    }
    await client.close()
}

run();