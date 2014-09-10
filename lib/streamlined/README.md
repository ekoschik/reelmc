POST /processes
	-> {
		"cwd": "/home/user", // the directry to run the command inside
		"exe": "/bin/ls", // the full path of the executable to run
		"args": ["arg1", "arg2"], // the command arguments
		"socket": "/home/user", // the optional path to the socket that should be created
		"name": "process1", // optional string to refer to this program as
	}
	<- {
		"pid": 54332, // the pid of the started process
		"socket": "/home/user", // the path to the created socket
		"exe": "/bin/ls", // the full path of the started executable
		"args": ["arg1", "arg2"], // the command arguments
		"cwd": "/home/user", // the directory to run the command inside
	}

GET /processes
	<- a list of process

GET /processes/54332
	<- the process represented by pid 54332

GET /processes/name
	<- the process represented by "name"

DELETE /processes/54332 /proceesses/name
	stop the process

POST /process/54332
	-> {
		"action": "pause" // one of ["pause", "resume"]
	}



	
