const path = require('path');
const os = require('os');

const client = require('./client');
const server = require('./server');

const client_address = `http://${client.ip}:${client.port}`;
const server_ip = server.ip;
const server_port = server.port;

const server_storage = ((__=server.storage)=>{

    const platform = os.platform();

    const N='\x1b[0m', Y='\x1b[33m', R='\x1b[31m'; // Normal, Yellow, Red
    const make_pathErrorMsg = (ERROR_PRECISION, path)=>{
        return ( `${Y}Bad provided path${N} : '${R}${path}${N}'\n`
               + `${ERROR_PRECISION}`
               + `API server launching aborted. ${Y}Please edit :\n`
               + `${N}\tThe property '${Y}config.storage${N}' (path) in file '${Y}config/server.js${N}'`);
    };

    const checkSpace_inPath = (()=>{
        const regex = (platform==='win32') ? /( +[\\\/] +| +[\\\/]|[\\\/] +)/ // on Windows
                                           : /( +[\/] +| +[\/]|[\/] +)/       // on Mac and Linux
        const separator = `'${Y}\\${N}', '${Y}/${N}'`;
        return (path)=>{
            let t = path.trim();
            if(t.match(regex)){
                const error = `Contains some ${Y}white space${N} sided to path separator ${separator}\n`;
                const msg = make_pathErrorMsg(error, path);
                console.log(msg);
                process.exit(1);
            }
        };
    })();
    
    const checkSpechar_inPath = (p)=>{
        const _p = p;
        if(platform === 'win32'){
            p = path.join(p, '/name.ext');
            const {root,dir} = path.parse(p);
            p = dir.replace(root,'');
            if(p.match(/[:*?"<>|]/)){
                const error = `Contains one or some ${Y}special character(s)${N} [${Y} : * ? " < > | ${N}] not allowed in path\n`;
                const msg = make_pathErrorMsg(error, _p);
                console.log(msg);
                process.exit(1);
            }
        }
    };

    // makes storage path compatible with concat : path + '/session_name'
    // and pledge an absolute path
    checkSpace_inPath(__);
    checkSpechar_inPath(__);
    __ = __.trim() || '.'; // makes ' ' and '' as '.' (relative)
    __ = path.join(__, '/name.ext');
    const {root,dir} = path.parse(__);
    const _dirname = module.parent.path; // c:/ | / | c:/dir | /dir

                                        // on Windows :
    if(root) __ = (root===dir) ? root   // root only // '/'    | '\\'     | 'c:/'   | 'c:\\'        | 'c:'
                               : dir;   // absolute  // '/sav' | 'c:/sav' | '/sav/' | 'c:\\a/b\\c/' | '/t.txt'
    else __ = path.join(_dirname, dir); // relative  // '.'    | ('')     | './sav' | 'sav'         | 'c'
    
    __ = path.join(__, '/').slice(0,-1);
    // ready to add '/session_name' at end of path
    return __;
})();

const server_mime = server.mime;
const server_caseSntv = server.case_sensitivity;

module.exports = {client_address, server_ip, server_port, server_storage, server_mime, server_caseSntv};
