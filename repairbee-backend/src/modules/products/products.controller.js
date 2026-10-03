const productsService = require('./products.service');
const ApiResponse = require('../../utils/apiResponse');

class ProductsController {
  async listProducts(req, res, next) {
    try {
      const products = await productsService.listProducts();
      return ApiResponse.success(res, products);
    } catch (error) { next(error); }
  }

  async getIssues(req, res, next) {
    try {
      const issues = await productsService.getIssuesByProduct(req.params.id);
      return ApiResponse.success(res, issues);
    } catch (error) { next(error); }
  }

  async addProduct(req, res, next) {
    try {
      const product = await productsService.addProduct(req.body);
      return ApiResponse.created(res, product);
    } catch (error) { next(error); }
  }

  async addIssueType(req, res, next) {
    try {
      const issue = await productsService.addIssueType(req.params.id, req.body);
      return ApiResponse.created(res, issue);
    } catch (error) { next(error); }
  }
}

module.exports = new ProductsController();
