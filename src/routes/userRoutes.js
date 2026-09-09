const express = require('express');
const userController = require('../controllers/userController')

const router = express.Router();

console.log('opa: '+router);

router.get('/', userController.index);
router.get('/:id', userController.show);
router.get('/:tipo_usuario', userController.showByType);

router.post('/', userController.create);
router.delete('/:id', userController.deleteById);
router.put('/:id', userController.update);

module.exports = router;