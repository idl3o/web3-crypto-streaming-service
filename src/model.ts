export class AppModel {
    private data: any;

    constructor(initialData: any = {}) {
        this.data = initialData;
    }

    // Get the current data
    getData(): any {
        return this.data;
    }

    // Update the data
    updateData(newData: any): void {
        this.data = { ...this.data, ...newData };
    }
}
