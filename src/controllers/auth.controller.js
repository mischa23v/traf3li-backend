const { User } = require('../models');
const { CustomException } = require('../utils');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const { JWT_SECRET, NODE_ENV } = process.env;
const saltRounds = 10;

const authRegister = async (request, response) => {
    const {
        // Basic info
        username,
        email,
        phone,
        password,
        firstName,
        lastName,
        image,
        description,

        // Location
        country,
        nationality,
        region,
        city,

        // Role & Type
        isSeller,
        role,
        lawyerMode,

        // Lawyer profile fields
        isLicensed,
        licenseNumber,
        courts,
        yearsOfExperience,
        workType,
        firmName,
        specializations,
        languages,
        isRegisteredKhebra,
        serviceType,
        pricingModel,
        hourlyRateMin,
        hourlyRateMax,
        acceptsRemote
    } = request.body;

    try {
        // Validation
        if (!username || !email || !password || !phone || !firstName || !lastName) {
            return response.status(400).send({
                error: true,
                message: 'الحقول المطلوبة: الاسم الأول، الاسم الأخير، اسم المستخدم، البريد الإلكتروني، كلمة المرور، رقم الجوال'
            });
        }

        // Password validation
        if (password.length < 8) {
            return response.status(400).send({
                error: true,
                message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
            });
        }

        const hash = bcrypt.hashSync(password, saltRounds);

        // Build user object
        const userData = {
            username,
            email,
            password: hash,
            firstName,
            lastName,
            phone,
            image,
            description,
            country: country || 'Saudi Arabia',
            nationality,
            region,
            city,
            isSeller: isSeller || false,
            role: role || (isSeller ? 'lawyer' : 'client'),
            lawyerMode: isSeller ? (lawyerMode || 'dashboard') : null
        };

        // Add lawyer profile if registering as lawyer
        if (isSeller) {
            // Transform courts object from frontend format to array format
            let courtsArray = [];
            if (courts && typeof courts === 'object') {
                courtsArray = Object.entries(courts)
                    .filter(([_, value]) => value.selected)
                    .map(([courtId, value]) => ({
                        courtId,
                        courtName: value.name || courtId,
                        caseCount: value.caseCount || null
                    }));
            }

            userData.lawyerProfile = {
                isLicensed: isLicensed || false,
                licenseNumber: licenseNumber || null,
                yearsExperience: parseInt(yearsOfExperience) || 0,
                workType: workType || null,
                firmName: firmName || null,
                specialization: specializations || [],
                languages: languages || ['العربية'],
                courts: courtsArray,
                isRegisteredKhebra: isRegisteredKhebra || false,
                serviceType: serviceType || null,
                pricingModel: pricingModel || [],
                hourlyRateMin: hourlyRateMin ? parseFloat(hourlyRateMin) : null,
                hourlyRateMax: hourlyRateMax ? parseFloat(hourlyRateMax) : null,
                acceptsRemote: acceptsRemote || null
            };
        }

        const user = new User(userData);
        await user.save();

        return response.status(201).send({
            error: false,
            message: 'تم إنشاء الحساب بنجاح!'
        });
    }
    catch({message}) {
        console.log('Registration error:', message);
        if(message.includes('E11000')) {
            // Check if it's email or username duplicate
            if (message.includes('email')) {
                return response.status(400).send({
                    error: true,
                    message: 'البريد الإلكتروني مستخدم بالفعل!'
                });
            }
            return response.status(400).send({
                error: true,
                message: 'اسم المستخدم مستخدم بالفعل!'
            });
        }
        return response.status(500).send({
            error: true,
            message: 'حدث خطأ ما، يرجى المحاولة مرة أخرى'
        });
    }
}

const authLogin = async (request, response) => {
    const { username, password } = request.body;
    
    try {
        // ✅ NEW: Accept both username AND email for login
        const user = await User.findOne({
            $or: [
                { username: username },
                { email: username }  // Allow email in username field
            ]
        });
        
        if(!user) {
            throw CustomException('Check username or password!', 404);
        }
        
        const match = bcrypt.compareSync(password, user.password);
        
        if(match) {
            const { password, ...data } = user._doc;
            
            const token = jwt.sign({
                _id: user._id,
                isSeller: user.isSeller
            }, JWT_SECRET, { expiresIn: '7 days' });
            
            const cookieConfig = {
                httpOnly: true,
                sameSite: NODE_ENV === 'production' ? 'none' : 'strict',
                secure: NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
                path: '/',
                domain: NODE_ENV === 'production' ? '.traf3li.com' : undefined
            }
            
            return response.cookie('accessToken', token, cookieConfig)
                .status(202).send({
                    error: false,
                    message: 'Success!',
                    user: data
                });
        }
        
        throw CustomException('Check username or password!', 404);
    }
    catch({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
}

const authLogout = async (request, response) => {
    return response.clearCookie('accessToken', {
        httpOnly: true,
        sameSite: NODE_ENV === 'production' ? 'none' : 'strict',
        secure: NODE_ENV === 'production',
        path: '/',
        domain: NODE_ENV === 'production' ? '.traf3li.com' : undefined
    })
    .send({
        error: false,
        message: 'User have been logged out!'
    });
}

const authStatus = async (request, response) => {
    try {
        const user = await User.findOne({ _id: request.userID }).select('-password');
        
        if(!user) {
            throw CustomException('User not found!', 404);
        }
        
        return response.send({
            error: false,
            message: 'Success!',
            user
        });
    }
    catch({message, status = 500}) {
        return response.status(status).send({
            error: true,
            message
        });
    }
}

module.exports = {
    authLogin,
    authLogout,
    authRegister,
    authStatus
};
