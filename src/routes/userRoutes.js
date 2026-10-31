const express = require('express');
const userController = require('../controllers/userController')
const {
  requireAuth,
  requireOwnUserParam,
  denyUserDirectoryAccess
} = require('../middlewares/requireAuth')
const { createRateLimit } = require('../middlewares/loginRateLimit')

const router = express.Router();
const registrationRateLimit = createRateLimit('registration')

router.post('/', registrationRateLimit, userController.create)

router.get('/', requireAuth, denyUserDirectoryAccess);
router.get('/:id', requireAuth, requireOwnUserParam, userController.show);
router.get('/:tipo_usuario', requireAuth, denyUserDirectoryAccess);

router.delete('/:id', requireAuth, requireOwnUserParam, userController.deleteById);
router.put('/:id', requireAuth, requireOwnUserParam, userController.update);

module.exports = router;