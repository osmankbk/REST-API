const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator/check');
const { Course, User } = require('../models');
const { Op } = require('sequelize');

//DRY async func
const asyncEnvelop = (cb) => {
    return async (req, res, next) =>{
        try {
            await cb(req, res, next) 
            
        } catch(err) {
            res.status(500).send(err.log);
            console.log(err.status);
        }
    }
}

//Authenticate users
const authenticateUser = async(req, res, next) => {
    let message = null;
    try {
        const credentials = auth(req);
        if(credentials){
            const user = User.findOne({
                where: {
                    emailAddress: {
                        [Op.eq]: credentials.name
                    }
                }
            });
            if(user){
                const authenticated = bcryptjs
                    .compareSync(credentials.pass, user.password);
                if(authenticated){
                    console.log(`Authentication successful for username ${user.emailAddress}`)
                    req.currentUser = user;
                } else {
                    message = `Authentication failure for username ${credentials.username}`;
                }
            } else {
                message = `User not found for username ${user.emailAddress}`;
            }
        } else {
            message = `Auth header not found`;
        }
        if(message){
            console.warn(message);
            res.status(401).json({message: 'Access Denied'});
        } else {
            next();
        }
    } catch(error) {
        console.log({error: error.message});
    }
}

//Get courses
router.get('/courses', asyncEnvelop(async(req, res) =>{
    try {
        const course = await Course.findAll({
            include: [{
                model: User,
            }],
        });
        res.status(200).json(course);
    } catch(err) {
        console.log({error: err});
    }
    
}));

//Get A course
router.get('/courses/:id', asyncEnvelop(async(req, res) =>{
    const course = await Course.findByPk(req.params.id, {
        include: [{
            model: User,
        }],
    });
    if(course) {
        res.status(200).json(course);
    } else {
        res.status(404).json({'error': 'course not available'});
    }
    
}));

//Post course
router.post('/courses', authenticateUser, [
    check('title')
    .exists({checkNull: true, checkFalsy: true})
    .withMessage('A title is required'),
    check('description')
    .exists({checkNull: true, checkFalsy: true})
    .withMessage('A description is required'),
    check('estimatedTime')
    .exists({checkNull: true, checkFalsy: true})
    .withMessage('An estimated time is required'),
    check('materialsNeeded')
    .exists({checkNull: true, checkFalsy: true})
    .withMessage('A list of materials is required')
], asyncEnvelop(async(req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const errorMessage = errors.array().map(err => err.msg);
        res.status(400).json({errors: errorMessage});
    } else {
        const course = await Course.create(req.body);
        res.status(201).end();
    }
}));

//Update course
router.put('/courses/:id', authenticateUser, [
    check('title')
    .exists({checkNull: true, checkFalsy: true})
    .withMessage('A title is required'),
    check('description')
    .exists({checkNull: true, checkFalsy: true})
    .withMessage('A description is required'),
    check('estimatedTime')
    .exists({checkNull: true, checkFalsy: true})
    .withMessage('An estimated time is required'),
    check('materialsNeeded')
    .exists({checkNull: true, checkFalsy: true})
    .withMessage('A list of materials is required')
], asyncEnvelop(async(req, res) =>{
    const errors = validationResult(req);
    const course = await Course.findByPk(req.params.id);
    if(!errors.isEmpty()){
        const errorMessage = errors.array().map(err => err.msg);
        res.status(400).json({errors: errorMessage});
    } else {
    if(course) {
        course = course.update(req.body);
        res.status(201).end();
    } else {
        res.status(404).json({'error': 'course not available'});
    }
    }
}));

//Delete course
router.delete('/courses/:id', authenticateUser,  asyncEnvelop(async(req, res) =>{
    const course = await Course.findByPk(req.params.id);
    if(course) {
        await course.destroy();
        res.status(204).end();
    } else {
        res.status(404).json({'error': 'course not available'});
    }
    
}));

module.exports = router;