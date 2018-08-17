package main

import (
	"net/http"
)

func serveFiles(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	if path == "/" {
		http.ServeFile(w, r, "assets/index.html")
	} else {
		http.ServeFile(w, r, "assets/"+path)
	}
}

func main() {
	http.HandleFunc("/", serveFiles)

	http.ListenAndServe(":8080", nil)
}
