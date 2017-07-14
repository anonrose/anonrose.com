import Component, { tracked } from '@glimmer/component';

export default class MyPosts extends Component {
  @tracked posts = []

  constructor() {
    super(arguments);
    this.loadPosts();
  }

  async loadPosts() {
    let response = await fetch('/posts');
    this.posts = await response.json();
  }
  didInsertElement() {
    $(document).ready(function(){
      $('.collapsible').collapsible();
    });
  }
  toggleOpen() {

  }
};
