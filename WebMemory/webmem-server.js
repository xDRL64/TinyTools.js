// imports
//
//

// internal modules :
const {readdirSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync} = require('fs');

// additional (local) modules :
const express = require('express');
const bodyParser = require('body-parser');

// api local resources :
const {	client_address,
		server_ip, server_port,
		server_storage, server_mime,
	    server_caseSntv } = require('./config/_load.js');

const api_info = JSON.parse(readFileSync('./package.json', 'utf-8'));

// settings up
//
//

const storage = {
	path : server_storage,
};

const session_cache = {};

const app = express();

app.use((req, res, next)=>{
	res.setHeader('Access-Control-Allow-Origin', client_address);
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	next();
});

app.use(bodyParser.text( {type:server_mime} ));

// api internal process
//
//

// Process : Check params of request.
//           If getting error in req param syntax, then reply to client already.
// Return : 'success' | 'failed' to keep or abort parent process running.
// Using : 1st param :: request object.
//         2nd param :: response object.
// Usage : Use it in routes resolving to check params respect API rules.
const check_reqParams = (req, res)=>{
	let error = '';
	const {session, index} = req.params;

	if(session){

		if( !server_caseSntv && session.match(/[A-Z]/) ){
			const msg = `API server does not accept case sensitivity :\n`
					  + `Invalid url params : session:${session} .`;
			res.json({status:'failed', msg, data:null});
			return 'failed';
		}

		if(!session.match(/^[\w\-_]+$/)) error+=`session:${session} `; // motif : word-_
	}

	if(index){
		// motif : last | new | free | +num | -num | num
		if( !index.match(/^(last|new|free|\+\d+|-\d+|\d+)$/) ) error+=`index:${index} `;
	}

	if(error){
		const msg = `Invalid url params : ${error}.`;
		res.json({status:'failed', msg, data:null});
		return 'failed';
	}
	else return 'success';
};

// Process : Check data of body request object.
//           If getting error of data type, then reply to client already.
// Return : 'success' | 'failed' to keep or abort parent process running.
// Using : 1st param :: request object.
//         2nd param :: response object.
// Usage : Use it in save process.
const check_reqBodyData = (req, res)=>{
	const dataType = typeof req.body;
	let msg = '';
	if(dataType !== 'string'){
		msg += `Error data's request body : API body parser failed :\n`;
		const client_mime = req.headers['content-type'];
		if(client_mime !== server_mime){
			msg += 'MIME type checking : '
			    +  `API waiting for '${server_mime}' and received '${client_mime}' .`;
		}
		res.json({status:'failed', msg, data:null});
		return 'failed';
	}
	return 'success';
};

// Process : Checks if folder path exists, and creates it if missing.
// Return : {path:without end file, file:end file, full:original path}
// Using : 1st param :: The path of folder chain to test.
//         2nd param :: Set true, if path arg contains file at the end.
// Usage : General usage in the api.
const pledge_dirPath = (path, isFile)=>{
	const path_frag = path.split('/');

	const file = isFile ? path_frag.pop() : null;

	let _path = '';

	path_frag.forEach( (e)=>{
		_path += e;
		if( !existsSync(_path) ) mkdirSync(_path);
		_path += '/';
	} );

	if(path_frag.length) _path = _path.slice(0,-1); // remove last '/'

	return {path:_path, file, full:path};
};


// Process : Adds session in "data storage side" and in "data cache memory".
// Return : The newly created session object from memory cache.
// Using : 1st param :: The name of the new session.
// Usage : Use it to create a new session.
const add_session = (name)=>{
	session_cache[name] = {};
	const path = `${storage.path}/${name}`;
	pledge_dirPath(path);
	return session_cache[name];
};

// Process : Gets session object from "data cache memory".
//           If session is not already loaded in cache mem,
//           then loads it from "data storage side" and put it in cache.
// Return : 'session object' on success | 'null' on failure.
// Using : 1st param :: The name of session to load.
// Usage : Use it to get session object.
const get_session = (name)=>{
	return session_cache[name] || (session_cache[name]=read_session(name));
};

// Process : Reads a session from "data storage side" and makes a session object.
// Return : 'session object' on success | 'null' on failure.
// Using : 1st param :: The name of session to read from server storage.
// Usage : Use it directly if api does not use cache mem sys.
const read_session = (name)=>{
	const path = `${storage.path}/${name}`;
	let obj_idAsKey = null;
	if( existsSync(path) ){
		const r = /^\d+ \d{4}\.\d{1,2}\.\d{1,2} \d{1,2}\;\d{1,2}\;\d{1,2}\ \d{1,4}$/; // motif : id yyyy.mm.dd hh.mm.ss ms
		const valid = readdirSync(path).filter( e=>e.match(r) );
		obj_idAsKey = valid.reduce( (a,c)=>(a[c.match(/(\d+)/)[1]]=c)&&a, {} ); // [0:sample,1:group]
	}
	return obj_idAsKey;
};

// Process : Resolve index as id alias : (last|new|free|+nth|-nth|id).
// Return : Valid id object with availability state : (found|free).
// Using : 1st param :: The target session object.
//         2nd param :: The index to resolve (id alias or id itseft).
// Usage : Use it to get a safe file id from a precise session at an index.
const get_id = (session_obj, index)=>{

	let o = null;
	
	const ids = Object.keys(session_obj).map(e=>parseInt(e));

	let i=0, iLen=ids.length;

	if(ids[0] === 0) // search for 'free'
		for(i=1; i<iLen; i++) if(ids[i-1]+1!==ids[i]) {i=ids[i-1]+1; break;}

	o = parseInt(index); // direct id
	let stat = ids.includes(o) ? 'found' : 'free';

	// alias id
	if(index === 'last'){o=ids.pop()??0;              stat=iLen?'found':'free';}
	if(index === 'new' ){o=(ids.pop()??-1)+1;         stat='free';}
	if(index === 'free'){o=i;                         stat='free';}
	if(index[0] === '+'){o=ids.at(parseInt(index));   stat='found';}
	if(index[0] === '-'){o=ids.at(parseInt(index)-1); stat='found';}

	if( o === undefined ) return {status:'error', msg:'index (id alias) [overflow] .', value:null};

	return {status:'okay', state:stat, msg:`index (id alias) [${stat}] .`, value:o};
};

// Process : Create a new name for a file, based on id, date and time.
//           File motif : id yyyy.mm.dd hh;mm;ss ms
// Return : new unique name with no extension.
// Using : 1st param :: The id of the file.
//         2nd param :: The associate date object.
// Usage : Use it to generate new unique name of file.
const build_name = (id, date)=>{
	const d = new Date();
	const day = `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()}`;
	const time = `${d.getHours()};${d.getMinutes()};${d.getSeconds()}`;
	const msec = `${d.getMilliseconds()}`;
	return `${id} ${day} ${time} ${msec}`;
};

// table of routes (express js)
//
//

app.post('/info/:session', (req,res)=>{
	if( check_reqParams(req,res)==='failed' ) return;

	const {session} = req.params;
	const session_obj = get_session(session);
	if( session_obj )
		res.json({status:'success', msg:null, data:session_obj});
	else{
		const msg = `Session '${session}' does not exist.`;
		res.json({status:'failed', msg, data:null});
	}
});

app.post('/save/:session/:index', (req,res)=>{
	if( check_reqParams(req,res)==='failed' ) return;
	if( check_reqBodyData(req,res)==='failed' )  return;

	const {session, index} = req.params;
	let session_obj = get_session(session);
	let path = `${storage.path}/${session}`;
	if(!session_obj) session_obj = add_session(session);
	const id = get_id(session_obj, index);
	if(id.status==='okay'){
		if(id.state==='found'){
			const oldFile = session_obj[id.value];
			rmSync(`${path}/${oldFile}`);
		}
		const fileName = build_name(id.value, new Date());
		path += `/${fileName}`;
		// serv update
		writeFileSync(path, req.body);
		session_obj[id.value] = fileName;
		res.json({status:'success', msg:id.msg, data:{id:id.value,name:fileName}});
	}else
		res.json({status:'failed', msg:id.msg, data:null});
});

app.post('/load/:session/:index', (req,res)=>{
	if( check_reqParams(req,res)==='failed' ) return;

	const {session, index} = req.params;
	const session_obj = get_session(session);
	if(session_obj){
		const id = get_id(session_obj, index);
		if(id.status==='okay' && id.state==='found'){
			const path = `${storage.path}/${session}/${session_obj[id.value]}`;
			const data = readFileSync(path, 'utf-8');
			res.json({status:'success', msg:id.msg, data});
		}else
			res.json({status:'failed', msg:id.msg, data:null});
	}else{
		const msg = `Session '${session}' does not exist.`;
		res.json({status:'failed', msg, data:null});
	}
});

// any other route
//

const anyOtherRoute = (req,res)=>{
	const msg = `Error : invalid API route : '${req.url}' .`;
	res.json({status:'failed', msg, data:null});
};

app.post('/:any', anyOtherRoute);
app.post('/:any/*', anyOtherRoute);


// falling on api root
//

const welcomeToTheRoot = (req,res)=>{
	const info = api_info;
	const msg = `Web-Memory : Welcome to the API root.\n`
	          + `${info.version} :: Docs : ${info.docs} .`;
	res.json({status:'failed', msg, data:null});
};

app.get('/', welcomeToTheRoot);
app.post('/', welcomeToTheRoot);

// starts api
//

const online = (info=server.address())=>console.log(`Web-Memory [Listening] ${info.address}:${info.port}`);

const server = app.listen(server_port, server_ip, online).on('error', (err) => {
	if (err.code === 'EADDRINUSE') {
		console.error(`Port ${server_port} is already used. Retrying with a free random one.`);
		// waits for one second and defines a rando free port num
		setTimeout( ()=>server.close(()=>server.listen(0,server_ip)), 1000);
	} else {
		console.error(`Error occurred: ${err.message}`);
		process.exit(1);
	}
});

console.log('Web-Memory [Ready]');
