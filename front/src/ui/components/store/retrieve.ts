export default class Store {
    static retrieve(model: string, id: number | string) {
        return fetch(`/${model}/${id}`);
    }
    static retrieveAll(model: string) {
        return fetch(`/${model}s`);
    }
}