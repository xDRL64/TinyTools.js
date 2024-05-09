WebMemory API



Description :

    WebMemory is a web API whose initial purpose is to provide a simple file storage system.
    The API was primarily designed to meet the debugging needs of client apps when debugging 
    requires replacing manual file transfer via browser inputs and outputs executing client 
    apps (drag and drop to web browser / download from web browser) with automated transfer through an external API.

    This API works with only one client app at once which are restricted in local network.



Index Table :

    WebMemory Files :

        API server application.

        API client library.

        Examples and Tools.

    Configuration and Settings :

        API server (ip/port/storage/mime/case)

        Client app connection (ip/port)

        Storage (session directory)

        Server IPs settings

    API Main Working

    File name patern

    API main features

        info Command

        save Command

        load Command

    Deleting elements

    API route parameters

        session name

        index

    API Response Messages

        Response Object Structure

        Error return management

        About Successfull Route 



WebMemory Files :

    The API project folder provides :

        - The API server application :
            as node js files.

        - A library to make API using more simple again :
            as web js file.

        - Examples using the API library like client apps :
            as html files.

        - An API resquest tester to use like a client app:
            as html file.

        - A basic web server application to execute client apps :
            as node js file.

    The API alone is made of 4 files :

        API server :

            webmem-server.js

        Configuration Folder :

            config/_load.js
            config/client.js
            config/server.js

    The library is made of one file :

        user-dev/client-lib/webmem-client.js

    Example of library using is a group of 2 files :

        user-dev/client-lib/webmem_client-demo.js
        user-dev/client-lib/webmem_client-demo(sync+log).js
        
    The API resquest tester is one file :

        user-dev/api-test/webmem-urlReqTester.html

    The web server to execute tester and examples is one file :

        user-dev/client-webserver.js
    
    Note that, on Windows you can launch servers '.js' but running the '.bat' file
    in the same folder if it is there. Which are in :

        webmem-server.bat
        user-dev/client-webserver.bat



Configuration and Settings :

    To set API server, edit file the config Object in : config/server.js

        ip : '127.0.0.1'

            IP or hostname of API server.
            By default it is '127.0.0.1'
            By setting '127.0.0.1' here, the client app will able to fetch() with 'localhost' and '127.0.0.1'

        port : 3000

            Port number of API server is listening.
            By default it is 3000, configure it if you need.
            Precise it in fetch() call from client app.

        storage : './service_storage'

            Session directory, where file saves will be made.
            By default it will be 'service_storage' at API root folder.
            It is very important to set it correctly, please read :
                'Session Directory (Storage Path)' on next section (little below).

        mime : ['text/*']
        
            MIME type to use between client and API.
            API only supports subtypes of 'text' type.
            And you can restrict it to less 'text' subtype, for example :
                mime : ['text/plain', 'text/html']
            By default it is no restrictive, all subtypes of 'text' are accpeted.
            Is important only while client sends request for file saving.
            And it does affect data themself, it is just really about accepting or rejecting types.

        case_sensitivity : false

            Keep it 'false' on Window OS, because folder names cannot be differentiated between lower and upper case.
                (In this case, we can use upper case for session names in requests, but there will be no distinction,
                by writing 'Session_Name' it is interpreted exactly like 'session_name' .)
            Set it 'true' on Mac and Linux if you want to use upper case to name sessions,
                thus 'Session_Name' is a session different than 'session_name' . 

    To set connection to client app, edit file the config Object in : config/client.js

        ip : '127.0.0.1'

            IP or hostname accepted by API server from client resquest.
            It is very important to use the exact same one in client app's web browser address bar.
			'localhost' is not equivalent to '127.0.0.1'
            By default it is '127.0.0.1'

        port : 5500

            Port number of client app server.
            Also the same one in client app's web browser address bar.
            By default it is 5500, ready to listen to requests from
            client app examples and request tester provided with the API.
            Feel free to configure it by according your needs.

    Session Directory (Storage Path) :

        You can define a relative path, it is relative to the api server folder.
        Or you can define an absolute path. But be sure what you set.

        Observe following rules :

            - The last element in path will be considered as the session directory.

                - Not to need to create manually the last element in path reprensenting session directory before starting API server,
                    it will be created automatically if it does not exist at saving a first session form client app request.

                - Absolute path case :

                    - Disk root :
                        on Windows set path : 'c:/' | 'c:\\' | 'c:' | '/' | '\\'
                        on Mac and Linux    : '/'
                    
                    - From disk root :
                        on Windows set path : 'c:/sav' | 'c:\\sav' | '/sav' | '\\sav'
                        on Mac and Linux    : '/sav'

                - Relative path case :

                    - It does not matter from where you run the API with the node command.
                        Relative paths start pointing to API server application folder.

                    - API server application root folder :
                        on Windows set path : '.' | './' | '.\\' |  '../' | '..\\'
                        on Mac and Linux    : '.' | './' | '../'

                    - To a folder :
                        on Windows set path : 'sav' | './sav' | '.\\sav' | '..' | '../' | '..\\' | '../sav' | '..\\sav'
                        on Mac and Linux    : 'sav' | './sav' | '..' | '../' | '../sav' |  

                    - Bad paths will be considered as a relative path to API serv app root dir too :
                        path containing spaces only ' '
                        path containing no character ''
                
            - Folder names with '.' character will be accepted as folder,
                even if it is the last element in path,
                and even if it sounds like a file name. example 'file.ext'

            - On Windows OS, path folder names containing the following characters :
                : * ? " < > |
                will be rejected, stopping API server launcher with log message in console
                displaying the rejected path.
            
            - Path separator usages :
                '\', '/' are accepted on Windows.
                '/' only is accepted on Mac and Linux, '\' will be considered as character of folder names.
                Multiple successive separators will be fusioned into only one separator.

            - White spaces in paths :
                Spaces in forler names are accepted,
                    for example : 'c:/sav dir' is valid.
                The API loading will be able to fix a path if it contains some space at its start or end.
                    For example : ' c:/sav' or './sav ' will be fixed by removing spaces.
                But spaces in middle of path, sided to separator will rejected the whole path.
                    For example : 'c:/ sav' or './ sav' will be rejected,
                    stopping API server launcher with log message in console
                    displaying the rejected path.
                    (standard OS behavior, file/folder names cannot have spaces at start or end)

            - Double dots '..' behave like expected :
                It is relative to its parent folder.
                It makes to get out from current folder back to the parent folder.
                It stops getting by when reach disk root.
                
            - To visualize better what you can expect, see the table juste below :

                -- 'config path' field is the value you put in config.storage in config/server.js
                -- The OS columns show what are the corresponding computed absolute paths,
                    which will be used as session directory where sessions are saved from client app requests.
                -- On Windows OS column, '/' and '\' are equivalent to 'c:\\'
                -- '/SNE' folder at end of computed path means "Session Name Example",
                    and represents an example of session that have beed created by client app.
                -- Always be over that 'config path' represents session directory, and so
                    this directory will contain all new created session from client app.

                config path          on Windows                         on Mac and Linux
                --------------------------------------------------------------------------------------
                ' '                  C:\path\to\webmem/SNE              /path/to/webmem/SNE
                '/t.txt'             \t.txt/SNE                         /t.txt/SNE
                '/'                  /SNE                               /SNE
                '\\'                 /SNE                               /path/to/webmem/\/SNE
                'c:/'                c:/SNE                             /path/to/webmem/c:/SNE
                'c:\\'               c:/SNE                             /path/to/webmem/c:\/SNE
                'c:'                 c:/SNE                             /path/to/webmem/c:/SNE
                '/sav'               \sav/SNE                           /sav/SNE
                'c:/sav'             c:\sav/SNE                         /path/to/webmem/c:/sav/SNE
                '/sav/'              \sav/SNE                           /sav/SNE
                '.'                  C:\path\to\webmem/SNE              /path/to/webmem/SNE
                ''                   C:\path\to\webmem/SNE              /path/to/webmem/SNE
                './sav'              C:\path\to\webmem\sav/SNE          /path/to/webmem/sav/SNE
                'sav'                C:\path\to\webmem\sav/SNE          /path/to/webmem/sav/SNE
                'c'                  C:\path\to\webmem\c/SNE            /path/to/webmem/c/SNE
                'c:\\a/b\\c/'        c:\a\b\c/SNE                       /path/to/webmem/c:\a/b\c/SNE
                ' ab cd '            C:\path\to\webmem\ab cd/SNE        /path/to/webmem/ab cd/SNE
                ' /ab cd/ '          \ab cd/SNE                         /ab cd/SNE
                '//',                /SNE                               /SNE
                '\\\\',              /SNE                               /path/to/webmem/\\/SNE
                '../sav'             C:\path\to\sav/SNE                 /path/to/sav/SNE
                'c:/a/b/../z'        c:\a\z/SNE                         /path/to/webmem/c:/a/z/SNE
                'c:/a/../..'         c:/SNE                             /path/to/webmem/SNE

                To complete, here we have some example of paths containing spaces in their middle
                and which are sided to path separator :

                config path          on Windows    on Mac and Linux
                ---------------------------------------------------
                'xx \\ xx'           rejected      ACCEPTED
                'xx \\xx'            rejected      ACCEPTED
                'xx\\ xx'            rejected      ACCEPTED
                'xx\\ \\xx'          rejected      ACCEPTED
                'xx \\ \\ xx'        rejected      ACCEPTED
                'xx\\ \\ \\ \\xx'    rejected      ACCEPTED
                'xx / xx'            rejected      rejected
                'xx /xx'             rejected      rejected
                'xx/ xx'             rejected      rejected
                'xx/ /xx'            rejected      rejected
                'xx / / xx'          rejected      rejected
                'xx/ / / /xx'        rejected      rejected
                'xx\\ /xx'           rejected      rejected
                'xx/ \\xx'           rejected      rejected
                'xx/ \\ / \\xx'      rejected      rejected
                'xx \\ / \\ / xx'    rejected      rejected
                'xx \\/\\ \\/xx'     rejected      ACCEPTED

        In all cases, when you run the API, at first it will check the path :
            config.storage in config/server.js
        then if there was no major bad path while checking, a prompt will appear in console,
        displaying the computed absolute session directory Storage Path
        and asking you to confirme it before really running server.

        It also displays an example of session like if created by client app
        to preview what it would look like to.

        It major bad path case, you will be notifyied in console by a message
        with a header 'Bad provided path' (in yellow) followed by the concerned bad path (in red)

    How to set server IPs :

        There are 5 places where you can set IPs :

            1. The API server itself, in file : config/server.js

            2. The provided client app's web server, in file : user-dev/client-webserver.js
            or your own client app's web server, in server settings of you side

            3. The client app's running, in web browser address bar

            4. The client app's requests, by fetch() calling, in client app's source code

            5. The API server's client request allowing, in file : config/client.js
            Write the exact same one as the one you plan to use in the web browser address bar
            while the client app is running.

    How to choose server IPs ? 'localhost' vs '127.0.0.1' :

        By default, it is set with '127.0.0.1' everywhere except
        in the fetch() calls in the test tool and example files provided in the project.
        By running them you can see a GUI containing text box to set it in realtime.

        Use it directly, this should work.

        If you want to set some custom settings, read the following part :

            If you use 'localhost', in some cases you may encounter connection problems.
            If you attempt a full 'localhost' configuration everywhere,
            it may work, but it may also not work for various reasons.
            The main reason could be that 'localhost' is too restrictive.

            Differences between 'localhost' and '127.0.0.1' :

                web server 'localhost' = web browser 'localhost' only
                web server '127.0.0.1' = web browser 'localhost' and '127.0.0.1'

                web browser 'localhost' = API server's client config 'localhost'
                web browser '127.0.0.1' = API server's client config '127.0.0.1'

                API server's config 'localhost' = client app's fetch() 'localhost' only
                API server's config '127.0.0.1' = client app's fetch() 'localhost' and '127.0.0.1'

                Conclusion : 'localhost' is more restrictive than '127.0.0.1' .

        For beginners in server and web development :

            If you are not sure how to proceed, or if you are undecided,
            please use the default settings, and if you have broken something, follow these instructions :

                Do not set any server with 'localhost', always use '127.0.0.1' :

                    - Do not use 'localhost' to set the example of client web server (client-webserver.js),
                    or to set your client web server.

                    - Do not use 'localhost' to set the API server (config/server.js)

                    - Access your app on [client web server] by [web browser] from address 'localhost' or '127.0.0.1'
                    but remember which one you choose
                    because you need to set the exact same one in the API server's [client configuration] (config/client.js)

                    - Finally, from [client app code] on [web server] you can send your requests to both,
                    either 'localhost' or '127.0.0.1', to connect to the API

                To summarize, we can keep it very simple by saying :

                    - Always use '127.0.0.1' to set/access everything except when you call fetch()

                    - Use any one of both ('localhost' or '127.0.0.1') to run fetch(),
                    like this : fetch('http://anyone:port/api_route')



Main Working :

    The API provides 3 main features : one to list, one to write and one to read, files into a system designed as backup storage like.
    It is an aprochoach based on increamental backuping paradigm per file.
    In the API, a 'folder' to store backups for a file is called 'session', to illustrate a session of backuping.
    The concept would like we name a session by the file name of the precise file for which we wish open a backuping session.

    Of course, this system can be used by various ways, but it is necessary to keep in mind that although you are allow to set some things
    you are not allow to set totally everything.

    The restrictions are :

        - All session folders are saved in same folder (session directory).

        - Major part of whole name of every file cannot be chosen.

    The permissions are :

        - To configure session directory path. (see section : How to set ...)

        - Only the 'id' part can be chosen in whole name of every file. (at its saving moment)


    Manipulate files can be very dangerous if a mistake occures,
    and extremely more again in the context for which the API is designed,
    which is debugging of apps in development. This is why some mesures are took.



File name patern :

    For prevention of file overwriting mistakes, the API saves only files with very unique names and with no file extension type.

    The patern is : id year.month.date hours;minutes;seconds milliseconds
    
    Min characters : i yyyy.m.d h;m;s m

    Max characters : id++ yyyy.mm.dd hh;mm;ss mls

    id : must be a positive number. (undefined max characters)



API main features :

    - Get the list of saved files in a precise session.

        Route : '/info/:session'

    - Save a specified file in a precise session.

        Route : '/save/:session/:index'

    - Load a specified file in a precise session.

        Route : '/load/:session/:index'


    Create new session :

        - A new session will be created by saving a first file in non existing session.

        - Also you can create manually the folder reprensenting a session in the session directory if you prefer.
        (In this case, please do not forget to check allowed characters to name a session correctly,
        see at : "API route parameters / session" in the docs)



Deleting elements (files / folders) :

    For security reasons, you have to delete manually files and session folders that you want to remove.
    You keep total control on file access permissions in Windows.
    You may not allow to delete from Windows explorer, be sure to close API server before deleting elements.



API route parameters :


    session : The session name.

        Used in every API routes (info / save / load)

        Allowed characters : a-z A-Z 0-9 - _


    index : The file identifier.

        Used in two API routes (save / load)

        Allowed values : last | new | free | +nth | -nth | id

            last : The higher file id.

                Example : if session contains the following file ids [3, 4, 6, 9] , 'last' selects the id '9' .
                          But if the session is empty (no file), 'last' selects the id '0' .

            new : The higher unused/free file id ('last' + 1) .

                Example : if session contains the following file ids [3, 4, 6, 9] , 'new' selects the id '10' .
                          But if the session is empty (no file), 'new' selects the id '0' .

            free : The first lower unused/free file id.

                Example : if session contains the following file ids [3, 4, 6, 9] , 'free' selects the id '0' .

            +nth : The nth file id relative to file count from the first file to the last one, that can be found in session.
                   From '+0' to +[length of file list]-1

                Example : if session contains the following file ids [3, 4, 6, 9] , '+1' selects the id '4' .
                          But if '+nth' is '+4', selected id will be out of file list and the API returns an id overflow error.
                          And so, '+0' is the first file id in list.

            -nth : The nth file id relative to file count from the last file to the first one, that can be found in session.
                   From -[length of file list]+1 to '-0'

                Example : if session contains the following file ids [3, 4, 6, 9] , '-1' selects the id '6' .
                          But if '-nth' is '-4', selected id will be out of file list and the API returns an id overflow error.
                          And so, '-0' is the last file id in list. (And is equivalent to use 'last' value as 'index' parameter)

            id : The precise id value, which can be unused/free or found.

                Example : if session contains the following file ids [3, 4, 6, 9] , '9' selects the id '9' .
                          Even if id corresponding to file that does not exist, '1' selects the id '1' .



API Response Messages :


    If your resquets reaches the API server, it will always responds be sending an Object as JSON string.
    Run a JSON parsing on the body's response to get the Object.

    The returned Object from API server always constains these following properties in this precise order :

        { status:'success'|'failed', msg:string|null, data:string|Object|null }

            status : The result of status' the command you have sent to the API server.
                     Always contains, either 'success' or 'failed' string value.

            msg    : The message of response, which always will be filed if you got a 'failed' status.

                     On success info : no message as : null
                     On success save : wrote file id state repport
                     On success load : loaded file id state repport
                     
            data   : Data depending on command, but always will be null if you got a 'failed' status.

                     On success info : session content Object
                     On success save : wrote file ref info Object
                     On success load : file data as string

    Error return management :

        About Invalid Route Syntax :

            Wrong sesion name :

                msg : "Invalid url params : session:se$$ion_name ."

                    /info/se$$ion_name

                    /save/se$$ion_name/last

                    /load/se$$ion_name/last

                msg : "API server does not accept case sensitivity :"
                      "Invalid url params : session:SeSSion_NamE ."

                    With settings : config/server.js :: config.case_sensitivity=false;

                        /info/SeSSion_NamE

                        /save/SeSSion_NamE/last

                        /load/SeSSion_NamE/last

            Wrong file index :

                msg : "Invalid url params : index:la$t ."

                    /save/session_name/la$t

                    /load/session_name/la$t

            Wrong session and index :

                msg : "Invalid url params : session:se$$ion index:LAst ."

                    /save/se$$ion/LAst

                    /load/se$$ion/LAst

            Not found session :

                msg : "Session 'unexisting_session' does not exist."
            
                    By requesting an non existing session :

                        /info/unexisting_session

                        /load/unexisting_session/last

        Falling on API route :

            msg : "Web-Memory : Welcome to the API root."
                  "0.0.0a :: Docs : http://github.com/user/repo/folder/docs ."

                /
        
        Non Existing Route :

            msg : "Error : invalid API route : '/anywhere/anything' ."

                /anywhere/anything

        Index Problems :

            Overflowed index of target file :

                msg : "index (id alias) [overflow] ."

                    '/save/session_name/+nth'

                    '/save/session_name/-nth'

                    '/load/session_name/+nth'

                    '/load/session_name/-nth'

            Non Existing id on loading file :

                msg : "index (id alias) [free] ."

                    /load/session_name/new

                    /load/session_name/free

                    If file id 0 does not exist :
                    
                        /load/session_name/0

        Wrong Data Transfer :

            msg : "Error data's request body : API body parser failed :"
                  "MIME type checking : API waiting for 'text/*' and received 'application/json' ."

                With settings : config/server.js :: config.mime='text/*';

                    /save/session_name/last , { headers = {"Content-Type":'application/json'} }

                With settings : config/server.js :: config.mime='text/plain';

                    /save/session_name/last , { headers = {"Content-Type":'text/html'} }

    About Successfull Route :

        Info of session:

            data : session content

                value : Object {'id':'name', 'id':'name', etc..}

            msg : null (NO MESSAGE)

                /indo/existing_session

        Save on free space :

            data : wrote file ref info
            
                value : Object {id:number, name:string}

            msg : "index (id alias) [free] ."

                /save/session_name/new

                If session does not exist :

                    /save/session_name/last

                    /save/session_name/0

        Save by overwriting :

            data : wrote file ref info
            
                value : Object {id:number, name:string}

            msg : "index (id alias) [found] ."

                /save/session_name/last

                /save/session_name/0

        Load of file :

            data : file data as string

                value : string

            msg : "index (id alias) [found] ."

                /load/session_name/last