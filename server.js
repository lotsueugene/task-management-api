const express = require('express');
const { db, Project, Task, User } = require('./database/setup');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());


// Express Session
const session = require('express-session');
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {  
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        req.user = {
            id: req.session.userId,
            name: req.session.userName,
            email: req.session.userEmail
        };
        next();
    } else {
        res.status(401).json({ 
            error: 'Authentication required. Please log in.' 
        });
    }
}

// Test database connection
async function testConnection() {
    try {
        await db.authenticate();
        console.log('Connection to database established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

testConnection();

// PROJECT ROUTES

// GET /api/projects - Get all projects
app.get('/api/projects', requireAuth, async (req, res) => {
    try {
        const projects = await Project.findAll({ where: { userId: req.session.userId } });
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// GET /api/projects/:id - Get project by ID
app.get('/api/projects/:id', requireAuth, async (req, res) => {
    try {
        const project = await Project.findOne({
            where: { id: req.params.id, userId: req.session.userId }
        });
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json(project);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// POST /api/projects - Create new project
app.post('/api/projects', requireAuth, async (req, res) => {
    try {
        const { name, description, status, dueDate } = req.body;
        
        const newProject = await Project.create({
            name,
            description,
            status,
            dueDate,
            userId: req.session.userId
        });
        
        res.status(201).json(newProject);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// PUT /api/projects/:id - Update existing project
app.put('/api/projects/:id', requireAuth, async (req, res) => {
    try {
        const { name, description, status, dueDate } = req.body;
        
        const [updatedRowsCount] = await Project.update(
            { name, description, status, dueDate },
            { where: { id: req.params.id, userId: req.session.userId } }
        );
        
        if (updatedRowsCount === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const updatedProject = await Project.findByPk(req.params.id);
        res.json(updatedProject);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// DELETE /api/projects/:id - Delete project
app.delete('/api/projects/:id', requireAuth, async (req, res) => {
    try {
        const deletedRowsCount = await Project.destroy({
            where: { id: req.params.id, userId: req.session.userId }
        });
        
        if (deletedRowsCount === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// TASK ROUTES

// GET /api/tasks - Get all tasks
app.get('/api/tasks', requireAuth, async (req, res) => {
    try {
        const tasks = await Task.findAll({include: {
            model: Project,
            where: { userId: req.session.userId }
        }});
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// GET /api/tasks/:id - Get task by ID
app.get('/api/tasks/:id', requireAuth, async (req, res) => {
    try {
         const task = await Task.findOne({
            where: { id: req.params.id },
            include: {
            model: Project,
            where: { userId: req.session.userId }
        }});

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json(task);
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
    }
});

// POST /api/tasks - Create new task
app.post('/api/tasks', requireAuth, async (req, res) => {
    try {
        const { title, description, completed, priority, dueDate, projectId } = req.body;
        
        const project = await Project.findOne({
            where: { id: projectId, userId: req.session.userId }
            });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
            }

        const newTask = await Task.create({
            title,
            description,
            completed,
            priority,
            dueDate,
            projectId
        });
        
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// PUT /api/tasks/:id - Update existing task
app.put('/api/tasks/:id', requireAuth, async (req, res) => {
    try {
        const { title, description, completed, priority, dueDate, projectId } = req.body;
        const task = await Task.findOne({
            where: { id: req.params.id },
            include: { model: Project, where: { userId: req.session.userId } }
            });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

      await task.update({ title, description, completed, priority, dueDate, projectId });
      res.json(task);


    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// DELETE /api/tasks/:id - Delete task
app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
    try {
        const task = await Task.findOne({
            where: { id: req.params.id },
            include: { model: Project, where: { userId: req.session.userId } }
            });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        await task.destroy();
        
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});



// Start server
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});