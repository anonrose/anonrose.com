import Component from '@glimmer/component';
import Store from '../store/retrieve';


export default class Front extends Component {
  didInsertElement(){
    Store.retrieveAll('post').then(resp => console.log(resp));
  }
};
