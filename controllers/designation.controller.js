const designationModel = require("../models/designation.model");
const designationService = require("../services/designation.service");

// async function addDesignation(req,res){
//     let reqData = req.body.designations;
//     reqData = reqData.map((item) => {
//         return {
//             designation_name: item.designation_name,
//             status: item.status == 'active' ? 1 : 0,

//         }
//     })
//     const data = await designationService.addDesignation(reqData);
//     return res.status(200).json({
//         success: true,
//         message: "Designation Added Success..!"
//     });
// }

// const addDesignations = (req, res) =>  {
//   try {
//     let reqData = req.body.designations;

//     if (!Array.isArray(reqData) || reqData.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No designations provided",
//       });
//     }

//     // Normalize request
//     reqData = reqData.map((item) => ({
//       designation_name: item.designation_name,
//       departmentId: item.departmentId, // Make sure you pass departmentId from frontend
//       status: item.status,
//     }));

//     await designationService.addDesignation(reqData);

//     return res.status(200).json({
//       success: true,
//       message: "Designations Added Successfully..!",
//     });
//   } catch (error) {
//     console.error("Error in addDesignation:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Something went wrong while adding designations",
//       error: error.message,
//     });
//   }
// }

const addDesignation = async (req, res) => {
  try {
    const { department_id, status, designation_name } = req.body;

    // if (!designation_id) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "designation_id is required.",
    //   });
    // }
	
	if (!designation_name) {
      return res.status(400).json({
        success: false,
        message: "designation_name is required.",
      });
    }
	
    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: "department_id is required.",
      });
    }

    const designation = await designationModel.create({
      designation_name,
      department_id,
      status, // optional because model has default 1
    });

    return res.status(200).json({
      success: true,
      message: "Designations Added Successfully..!",
      designation_id: designation._id,
    });
  } catch (error) {
    console.error("Error in addDesignation:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while adding designations",
      error: error.message,
    });
  }
};

async function getAllDesignation(req, res) {
  try {
    // const data = await designationService.getAllDesignation();
    const { departmentId } = req.query; // or req.body depending on frontend

    let data = await designationModel.aggregate([
      {
        $lookup: {
          from: "departments", // collection name of departments
          localField: "department_id",
          foreignField: "_id",
          as: "department",
        },
      },
      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          designation_id: 1,
          designation_name: 1,
          designation_slug: 1,
          status: 1,
          department_name: "$department.department_name",
          department_id: "$department._id",
          createdAt: 1,
        },
      }
    ]).sort({createdAt: -1});

    return res.status(200).json({
      success: true,
      message: "Departments Fetched Successfully..!",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
      error: error.message,
    });
  }
}

async function getDesignationById(req, res) {
  try {
    const _id = req.params._id;
	
	if (!_id) {
      return res.status(400).json({
        success: false,
        message: "Designation ID is required.",
      });
    }
	
    // console.log("_id ---> ", _id)
    let data = await designationService
      .getAllDesignationById(_id);
      
	  
	if (!data) {
      return res.status(404).json({
        success: false,
        message: "Designation not found.",
      });
    }  

    return res.status(200).json({
      success: true,
      message: "Designation Fetched Successfully..!",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch designation",
      error: error.message,
    });
  }
}

async function updateDesignation(req, res) {
  try {
    const { designation_id, department_id, status, designation_name } =
      req.body;

    if (!designation_id) {
      return res.status(400).json({
        success: false,
        message: "designation_id is required.",
      });
    }
	
	if (!designation_name) {
      return res.status(400).json({
        success: false,
        message: "designation_name is required.",
      });
    }

    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: "department_id is required.",
      });
    }

    const updateData = {
      status,
      designation_name,
      department_id,
    };

    const data = await designationModel.findOneAndUpdate(
      { _id: designation_id },
      { $set: updateData },
      { new: true } // return updated document
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Designation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Designation updated successfully!",
      data, // send updated department back
    });
  } catch (error) {
    console.error("Error updating department:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
	  error: error.message,
    });
  }
}

module.exports = {
  addDesignation,
  getAllDesignation,
  updateDesignation,
  // deleteDesignation,
  getDesignationById,
};
