const webmem = (()=>{

	const lib = {};

	// exported client lib
	//
		lib.hostname = 'localhost';
		lib.port     = '3000'; // str or num // no matter
		lib.mime     = 'text/plain';

		lib.config = (hostname, port, mime)=>{
			if(hostname) lib.hostname = hostname;
			if(port)     lib.port     = port;
			if(mime)     lib.mime     = mime;
		};

		lib.cmd = {};

		lib.cmd.info = (session_name)=>{
			dataSlot = null;
			return REQ('info', session_name);
		};

		lib.cmd.save = (session_name, file_index, file_data)=>{
			dataSlot = file_data;
			return REQ('save', session_name, file_index);
		};
		
		lib.cmd.load = (session_name, file_index)=>{
			dataSlot = null;
			return REQ('load', session_name, file_index);
		};

		lib.result = {
			status : null,
			message : null,
			data : null,
		};

	// internal process
	//
		let dataSlot = null;

		const options = {
			method : 'POST',
			headers : {
				"Content-Type"                   : lib.mime,
				"Access-Control-Request-Headers" : 'Content-Type,API-Key',
				"Access-Control-Request-Method"  : 'POST',
			},
			body: null,
		};

		const set_result = (status, message, data)=>{
			lib.result.status  = status;
			lib.result.message = message;
			lib.result.data    = data;
		};

		const REQ = async(type, session, index)=>{
			const {hostname, port, mime} = lib;

			const url =  ((index??null)   && `http://${hostname}:${port}/${type}/${session}/${index}`)
			          || ((session??null) && `http://${hostname}:${port}/${type}/${session}`         );

			options.headers["Content-Type"] = mime;
			options.body = dataSlot;

			// req attempt
			try{
				const response = await fetch(url, options);
				if(response.ok){
					set_result('success', null, await response.text())
				}else{
					const msg = `${response.status} : ${response.statusText}`;
					set_result('failed', msg, {msg});
				}
			}catch(err){
				set_result('failed', err.stack, err);
			}

			return lib.result;
		};

	return lib;
})();