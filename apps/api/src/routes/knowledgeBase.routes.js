const router = require('express').Router();
const ctrl = require('../controllers/knowledgeBase.controller');
const { authenticate, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');

router.use(authenticate, requireTenantUser, requireEnabledModule('customerCare'));

router.get('/categories', ctrl.listCategories);
router.post('/categories', ctrl.createCategory);

router.get('/articles', ctrl.listArticles);
router.post('/articles', ctrl.createArticle);
router.put('/articles/:id', ctrl.updateArticle);

module.exports = router;
