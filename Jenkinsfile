pipeline{
  agent any 

stages{
  stage("pull"){
    steps{
      git branch: 'main', credentialsId: 'git-id', url: 'https://github.com/kirandhurve18/project-new-backend.git'      
       }
    }

  stage("build"){
    steps{
      sh '''
      docker build -t backendimage .
      docker run -d -p 3006:3006 --name backendcontainer backendimage 
      '''
          }
       }
    }
}
