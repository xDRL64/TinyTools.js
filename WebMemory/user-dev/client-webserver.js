const http = require('http');
const fs = require('fs');

const host = '127.0.0.1';

const port = 5500;

const indexHTML = [
	{	name : 'Web-Memory API - URL Request Tester',
		path:'./api-test/webmem-urlReqTester.html'
	},
	{	name : 'webmem-client.js - Demo (async/minimal)',
		path:'./client-lib/webmem_client-demo.html'
	},
	{	name : 'webmem-client.js - Demo (sync/pagelogs)',
		path:'./client-lib/webmem_client-demo(sync+log).html'
	},
];

const generate_indexHTML = ()=>{
	let htmlCode = `<h1>Client Side - Example Index :</h1><br/><br/><br/>`;
	indexHTML.forEach(a=>htmlCode+=`<a href="${a.path}">${a.name}</a><br/><br/>`);
	return htmlCode;
};

const fillResponse = (res, code, data, headers = {}) => {
	res.statusCode = code;
	for (const [key, value] of Object.entries(headers)) {
		res.setHeader(key, value);
	}
	res.end(data);
};

const server = http.createServer((req, res) => {

	if (req.method === 'POST') {
		fillResponse(res, 501, 'Not Implemented');
		return;
	}

	const url = req.url;

	if(url === '/'){
		const data = generate_indexHTML();
		fillResponse(res, 200, data, { 'Content-Type' : 'text/html' });
		return;
	}
	
	try {
		const filePath = `.${url}`;
		const data = fs.readFileSync(filePath);
		const fileExt = url.match(/\.(?=[^.]*$)[^.]*$/)?.[0];
		fillResponse(res, 200, data, { 'Content-Type': fileExt === '.html' ? 'text/html' : 'text/plain' });
	} catch (err) {
		if (err.code === 'ENOENT') {
			fillResponse(res, 404, 'File not found');
		} else {
			fillResponse(res, 500, 'Internal Server Error');
		}
	}
});

const online = (info=server.address())=>console.log(`Server running at http://${info.address}:${info.port}/`);

server.listen(port, host, online).on('error', (err) => {
	if (err.code === 'EADDRINUSE') {
		console.error(`Port ${port} is already used. Retrying with a free random one.`);
		// waits for one second and defines a rando free port num
		setTimeout( ()=>server.close(()=>server.listen(0,host)), 1000);
	} else {
		console.error(`Error occurred: ${err.message}`);
		process.exit(1);
	}
});
