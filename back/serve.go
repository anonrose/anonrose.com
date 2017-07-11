package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"

	"github.com/russross/blackfriday"
)

type post struct {
	Content string
}

func getPost(postid string) *post {
	input, _ := ioutil.ReadFile("assets/posts/" + postid + "/index.md")
	content := blackfriday.MarkdownCommon(input)
	return &post{Content: string(content[:])}
}

func serveFiles(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	if path == "/" {
		http.ServeFile(w, r, "assets/index.html")
	} else if strings.Contains(path, "post") {
		servePosts(w, r, path)
	} else {
		http.ServeFile(w, r, "assets/"+path)
	}
}

func servePosts(w http.ResponseWriter, r *http.Request, path string) {
	if strings.Contains(r.URL.Path, "posts") {
		var posts []*post
		postDirectories, _ := ioutil.ReadDir("assets/posts")
		for i := 1; i < len(postDirectories); i++ {
			posts = append(posts, getPost(strconv.Itoa(i)))
		}
		marshalledPosts, _ := json.Marshal(posts)
		fmt.Fprintln(w, string(marshalledPosts))
	}
}

func main() {
	http.HandleFunc("/", serveFiles)

	http.ListenAndServe(":8080", nil)
}
