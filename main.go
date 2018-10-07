package main

import (
	"net/http"

	"google.golang.org/appengine" // Required external App Engine library
)

func serveFiles(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	if path == "/" {
		http.ServeFile(w, r, "dist/index.html")
	} else {
		http.ServeFile(w, r, "dist/"+path)
	}
}

func main() {
	http.HandleFunc("/", serveFiles)
	appengine.Main()
}
